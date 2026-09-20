import { type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const CreateCardSchema = z
  .object({
    promptId: z.string().uuid(),
    columnId: z.string().uuid(),
    scheduledAt: z.string().datetime().optional().nullable(),
    pageId: z.string().uuid().optional().nullable(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = CreateCardSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { promptId, columnId, scheduledAt, pageId } = parsed.data;
    const supabase = await createClient();

    // 1. Fetch column to check if it has a board_date
    const { data: column, error: colErr } = await supabase
      .from("board_columns")
      .select("id, board_date")
      .eq("id", columnId)
      .eq("user_id", user.id)
      .single();

    if (colErr || !column) {
      return apiError("NOT_FOUND", "Board column not found.", 404);
    }

    // 2. Check Daily Cap if this is a calendar day column
    if (column.board_date) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_post_cap")
        .eq("id", user.id)
        .single();

      const cap = profile?.daily_post_cap ?? 3;
      const { count } = await supabase
        .from("board_cards")
        .select("id", { count: "exact", head: true })
        .eq("column_id", columnId)
        .eq("user_id", user.id);

      if ((count || 0) >= cap) {
        return apiError(
          "DAILY_CAP_REACHED",
          `Daily post cap of ${cap} posts reached for this day. You can adjust this in Settings.`,
          400
        );
      }
    }

    // 3. Guardrails: Prompt must be approved/ready with a succeeded generation
    const { data: prompt, error: promptErr } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", promptId)
      .eq("user_id", user.id)
      .single();

    if (promptErr || !prompt) {
      return apiError("NOT_FOUND", "Prompt not found.", 404);
    }

    const { data: successfulGen } = await supabase
      .from("generations")
      .select("*")
      .eq("prompt_id", promptId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!successfulGen) {
      return apiError(
        "GENERATION_NOT_READY",
        "Cannot schedule post without an approved, successfully generated image.",
        400
      );
    }

    // 4. Validate Facebook Page if provided
    let finalPageId = pageId;
    if (!finalPageId) {
      const { data: defaultPage } = await supabase
        .from("facebook_pages")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      finalPageId = defaultPage?.id || null;
    }

    // 5. Insert card
    const cardId = crypto.randomUUID();
    const cardStatus = scheduledAt ? "scheduled" : "planned";

    const { data: newCard, error: insertErr } = await supabase
      .from("board_cards")
      .insert({
        id: cardId,
        user_id: user.id,
        column_id: columnId,
        prompt_id: promptId,
        generation_id: successfulGen.id,
        facebook_page_id: finalPageId,
        position: Date.now(),
        scheduled_at: scheduledAt || null,
        status: cardStatus,
      })
      .select()
      .single();

    if (insertErr || !newCard) {
      return apiError("INTERNAL_ERROR", insertErr?.message || "Failed to create card", 500);
    }

    // 6. Update prompt status (valid prompt status: scheduled or approved)
    const promptStatus = scheduledAt ? "scheduled" : "approved";
    await supabase
      .from("prompts")
      .update({ status: promptStatus })
      .eq("id", promptId)
      .eq("user_id", user.id);

    return apiSuccess(newCard, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add card to board";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
