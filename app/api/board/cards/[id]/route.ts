import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { requireSameOrigin } from "@/app/_lib/api-security";

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
    const originError = requireSameOrigin(request);
    if (originError) return originError;
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
    const admin = getSupabaseAdminClient();

    // 1. If unscheduling
    if (scheduledAt === null) {
      const { error: unscheduleErr } = await supabase.rpc("unschedule_card", {
        p_card_id: id,
      });
      if (unscheduleErr) {
        console.error("Could not unschedule card", unscheduleErr);
        return apiError("VALIDATION_ERROR", "This post could not be unscheduled. Refresh and try again.", 409);
      }
    }

    // 2. If setting schedule time
    if (scheduledAt) {
      let resolvedPageId = pageId;
      if (!resolvedPageId) {
        const { data: currentCard } = await admin
          .from("board_cards")
          .select("facebook_page_id")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        resolvedPageId = currentCard?.facebook_page_id || null;

        if (!resolvedPageId) {
          const { data: defaultPage } = await admin
            .from("facebook_pages")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_default", true)
            .maybeSingle();
          resolvedPageId = defaultPage?.id || null;
        }
      }

      if (!resolvedPageId) {
        return apiError("PAGE_NOT_CONNECTED", "Connect a valid Facebook Page before scheduling.", 400);
      }
      {
        const scheduledDate = new Date(scheduledAt);
        const now = Date.now();
        if (!Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() < now + 15 * 60 * 1000 || scheduledDate.getTime() > now + 30 * 24 * 60 * 60 * 1000) {
          return apiError("SCHEDULE_WINDOW_INVALID", "Choose a time from 15 minutes to 30 days from now.", 400);
        }
        const { error: scheduleErr } = await supabase.rpc("schedule_card", {
          p_card_id: id,
          p_scheduled_at: scheduledAt,
          p_page_id: resolvedPageId,
        });

        if (scheduleErr) {
          console.error("Could not schedule card", scheduleErr);
          return apiError("VALIDATION_ERROR", "This post could not be scheduled. Check the page, time, and daily limit.", 409);
        }
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
        console.error("Could not move card", moveErr);
        return apiError("VALIDATION_ERROR", "This card could not be moved. Refresh and try again.", 409);
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
    console.error("Card update failed", err);
    return apiError("INTERNAL_ERROR", undefined, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
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
