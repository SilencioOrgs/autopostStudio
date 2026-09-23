import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { requireSameOrigin } from "@/app/_lib/api-security";

export async function POST(
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
    const admin = getSupabaseAdminClient();

    const { data: post, error } = await supabase
      .from("posts")
      .select("card_id, prompt_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !post) {
      return apiError("NOT_FOUND", "Post not found.", 404);
    }

    if (post.card_id) {
      const { error: unscheduleError } = await supabase.rpc("unschedule_card", { p_card_id: post.card_id });
      if (unscheduleError) {
        console.error("Could not cancel scheduled post", unscheduleError);
        return apiError("VALIDATION_ERROR", "This post could not be cancelled. Refresh and try again.", 409);
      }
    } else {
      const { error: cancelError } = await admin.from("posts").update({ status: "cancelled" })
        .eq("id", id).eq("user_id", user.id).eq("status", "scheduled");
      if (cancelError) return apiError("INTERNAL_ERROR", undefined, 500);
    }

    // If linked to a card, reset card to planned
    return apiSuccess({ cancelled: true, message: "Scheduled publication cancelled." });
  } catch (err: unknown) {
    console.error("Post cancellation failed", err);
    return apiError("INTERNAL_ERROR", undefined, 500);
  }
}
