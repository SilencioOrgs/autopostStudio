import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { addDateColumn } from "@/app/_lib/services/board";

const TransferSchema = z
  .object({
    cardIds: z.array(z.string().uuid()).min(1, "Select at least one card to transfer"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    mode: z.enum(["sequential", "same_day"]).default("sequential"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM").default("19:00"),
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

    const parsed = TransferSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { cardIds, startDate, mode, time } = parsed.data;
    const admin = getSupabaseAdminClient();

    // 1. Fetch default Facebook Page if available
    const { data: defaultPage } = await admin
      .from("facebook_pages")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const startBaseDate = new Date(startYear, startMonth - 1, startDay);

    const transferredCards = [];

    for (let i = 0; i < cardIds.length; i++) {
      const cardId = cardIds[i];

      // Calculate target date for this card
      const targetDateObj = new Date(startBaseDate);
      if (mode === "sequential") {
        targetDateObj.setDate(targetDateObj.getDate() + i);
      }

      const year = targetDateObj.getFullYear();
      const month = String(targetDateObj.getMonth() + 1).padStart(2, "0");
      const day = String(targetDateObj.getDate()).padStart(2, "0");
      const targetDateStr = `${year}-${month}-${day}`;

      // Ensure date column exists
      const column = await addDateColumn(user.id, targetDateStr);

      const scheduledAt = new Date(`${targetDateStr}T${time}:00+08:00`).toISOString();

      // Update card
      const { data: updatedCard, error: cardErr } = await admin
        .from("board_cards")
        .update({
          column_id: column.id,
          scheduled_at: scheduledAt,
          facebook_page_id: defaultPage?.id || undefined,
          status: "scheduled",
          position: i + 1,
        })
        .eq("id", cardId)
        .eq("user_id", user.id)
        .select("id, prompt_id, column_id, scheduled_at, status")
        .single();

      if (!cardErr && updatedCard) {
        transferredCards.push(updatedCard);

        // Update prompt status
        if (updatedCard.prompt_id) {
          await admin
            .from("prompts")
            .update({ status: "scheduled" })
            .eq("id", updatedCard.prompt_id)
            .eq("user_id", user.id);
        }
      }
    }

    return apiSuccess({
      transferredCount: transferredCards.length,
      mode,
      cards: transferredCards,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to transfer cards";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
