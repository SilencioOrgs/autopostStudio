import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const UpdateCardSchema = z
  .object({
    columnId: z.string().uuid().optional(),
    position: z.number().optional(),
    scheduledAt: z.string().datetime().optional().nullable(),
    pageId: z.string().uuid().optional().nullable(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { id } = await params;
    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = UpdateCardSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { columnId, position, scheduledAt, pageId } = parsed.data;
    const supabase = await createClient();

    // 1. If unscheduling
    if (scheduledAt === null) {
      const { error: unscheduleErr } = await supabase.rpc("unschedule_card", {
        p_card_id: id,
      });
      if (unscheduleErr) {
        return apiError("VALIDATION_ERROR", unscheduleErr.message, 400);
      }
    }

    // 2. If scheduling
    if (scheduledAt && pageId) {
      const { error: scheduleErr } = await supabase.rpc("schedule_card", {
        p_card_id: id,
        p_scheduled_at: scheduledAt,
        p_page_id: pageId,
      });
      if (scheduleErr) {
        return apiError("VALIDATION_ERROR", scheduleErr.message, 400);
      }
    }

    // 3. If moving position / column
    if (columnId !== undefined && position !== undefined) {
      const { error: moveErr } = await supabase.rpc("move_card", {
        p_card_id: id,
        p_column_id: columnId,
        p_position: position,
      });
      if (moveErr) {
        return apiError("VALIDATION_ERROR", moveErr.message, 400);
      }
    }

    // Return updated card
    const { data: updatedCard, error: fetchErr } = await supabase
      .from("board_cards")
      .select("*, prompts(*), generations(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !updatedCard) {
      return apiError("NOT_FOUND", "Card not found.", 404);
    }

    return apiSuccess(updatedCard);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update card";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { id } = await params;
    const supabase = await createClient();

    // 1. If scheduled, unschedule first via RPC to preserve invariant
    await supabase.rpc("unschedule_card", { p_card_id: id });

    // 2. Fetch card to get prompt_id
    const { data: card } = await supabase
      .from("board_cards")
      .select("prompt_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    // 3. Delete card
    const { error: delErr } = await supabase
      .from("board_cards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (delErr) {
      return apiError("INTERNAL_ERROR", delErr.message, 500);
    }

    return apiSuccess({ deleted: true, cardId: id, promptId: card?.prompt_id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove card";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
