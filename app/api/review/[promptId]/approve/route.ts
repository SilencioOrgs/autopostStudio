import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { promptId } = await params;
    const supabase = await createClient();

    // 1. Attempt atomic RPC if defined in Supabase schema
    const { data: rpcCard, error: rpcErr } = await supabase.rpc("approve_prompt", {
      p_prompt_id: promptId,
    });

    if (!rpcErr && rpcCard) {
      return apiSuccess({
        approved: true,
        cardId: rpcCard.id,
        promptId,
        message: "Post approved and placed in posting backlog.",
      });
    }

    // 2. Resilient fallback: execute approval directly if RPC is not present in schema
    const admin = getSupabaseAdminClient();

    // 2a. Idempotency check: return existing card if already created
    const { data: existingCard } = await admin
      .from("board_cards")
      .select("id")
      .eq("prompt_id", promptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCard) {
      return apiSuccess({
        approved: true,
        cardId: existingCard.id,
        promptId,
        message: "Post approved and placed in posting backlog.",
      });
    }

    // 2b. Fetch prompt
    const { data: prompt } = await admin
      .from("prompts")
      .select("*")
      .eq("id", promptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!prompt) {
      return apiError("NOT_FOUND", "Prompt not found or unauthorized", 404);
    }

    // 2c. Fetch latest succeeded generation
    const { data: gen } = await admin
      .from("generations")
      .select("id")
      .eq("prompt_id", promptId)
      .eq("user_id", user.id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2d. Ensure Backlog column exists (board_date IS NULL)
    const { data: backlogCols } = await admin
      .from("board_columns")
      .select("id")
      .eq("user_id", user.id)
      .is("board_date", null)
      .order("created_at", { ascending: true })
      .limit(1);

    let backlogCol = backlogCols?.[0] || null;

    if (!backlogCol) {
      const { data: newCol, error: colErr } = await admin
        .from("board_columns")
        .insert({
          user_id: user.id,
          board_date: null,
          title: "Backlog",
          position: 0,
        })
        .select("id")
        .single();

      if (colErr || !newCol) {
        return apiError("INTERNAL_ERROR", colErr?.message || "Failed to create Backlog column", 500);
      }
      backlogCol = newCol;
    }

    // 2e. Get next position in Backlog
    const { data: cardsInCol } = await admin
      .from("board_cards")
      .select("position")
      .eq("column_id", backlogCol.id)
      .order("position", { ascending: false })
      .limit(1);

    const nextPos = (cardsInCol?.[0]?.position ? Number(cardsInCol[0].position) : 0) + 1;

    // 2f. Insert board card
    const { data: newCard, error: cardErr } = await admin
      .from("board_cards")
      .insert({
        user_id: user.id,
        column_id: backlogCol.id,
        prompt_id: promptId,
        generation_id: gen?.id || null,
        position: nextPos,
        status: "planned",
      })
      .select("id")
      .single();

    if (cardErr || !newCard) {
      return apiError("INTERNAL_ERROR", cardErr?.message || "Failed to create board card", 500);
    }

    // 2g. Update prompt status to 'approved'
    await admin
      .from("prompts")
      .update({ status: "approved" })
      .eq("id", promptId);

    // 2h. Log activity
    try {
      await admin.from("activity_log").insert({
        user_id: user.id,
        entity_type: "prompt",
        entity_id: promptId,
        action: "approved",
        metadata: { card_id: newCard.id },
      });
    } catch {}

    return apiSuccess({
      approved: true,
      cardId: newCard.id,
      promptId,
      message: "Post approved and placed in posting backlog.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Approval failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
