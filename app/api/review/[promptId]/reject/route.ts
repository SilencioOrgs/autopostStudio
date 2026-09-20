import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const RejectSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { promptId } = await params;
    const json = await request.json().catch(() => ({}));
    const parsed = RejectSchema.safeParse(json);
    const reason = parsed.success ? parsed.data.reason : undefined;

    const supabase = await createClient();

    // Call atomic reject_prompt RPC
    const { error } = await supabase.rpc("reject_prompt", {
      p_prompt_id: promptId,
      p_reason: reason || "Creator rejected prompt",
    });

    if (error) {
      return apiError("VALIDATION_ERROR", error.message, 400);
    }

    return apiSuccess({
      rejected: true,
      promptId,
      message: "Prompt rejected and returned to draft.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Rejection failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
