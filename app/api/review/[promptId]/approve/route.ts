import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
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

    // Call atomic, idempotent approve_prompt RPC
    const { data: card, error } = await supabase.rpc("approve_prompt", {
      p_prompt_id: promptId,
    });

    if (error) {
      return apiError("VALIDATION_ERROR", error.message, 400);
    }

    return apiSuccess({
      approved: true,
      cardId: card.id,
      promptId,
      message: "Post approved and placed in posting backlog.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Approval failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
