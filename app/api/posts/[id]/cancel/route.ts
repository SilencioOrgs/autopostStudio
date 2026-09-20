import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function POST(
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

    const { data: post, error } = await supabase
      .from("posts")
      .select("card_id, prompt_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !post) {
      return apiError("NOT_FOUND", "Post not found.", 404);
    }

    // Cancel post
    await supabase
      .from("posts")
      .update({ status: "cancelled" })
      .eq("id", id);

    // If linked to a card, reset card to planned
    if (post.card_id) {
      await supabase
        .from("board_cards")
        .update({ status: "planned", scheduled_at: null })
        .eq("id", post.card_id);
    }

    // Reset prompt to approved
    if (post.prompt_id) {
      await supabase
        .from("prompts")
        .update({ status: "approved" })
        .eq("id", post.prompt_id);
    }

    return apiSuccess({ cancelled: true, message: "Scheduled publication cancelled." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cancel failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
