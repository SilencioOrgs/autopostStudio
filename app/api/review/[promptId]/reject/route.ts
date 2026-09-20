import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const RejectSchema = z
  .object({
    reason: z.string().max(500).optional(),
    requeue: z.boolean().optional(),
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

    // 1. Attempt atomic reject_prompt RPC if present
    const { error: rpcErr } = await supabase.rpc("reject_prompt", {
      p_prompt_id: promptId,
      p_reason: reason || (parsed.success && parsed.data.requeue ? "Requeued by creator" : "Discarded by creator"),
    });

    if (!rpcErr) {
      // If user chose to discard rather than draft, update to failed
      if (parsed.success && parsed.data.requeue === false) {
        const admin = getSupabaseAdminClient();
        await admin
          .from("prompts")
          .update({ status: "failed" })
          .eq("id", promptId)
          .eq("user_id", user.id);
      }

      return apiSuccess({
        rejected: true,
        promptId,
        message: parsed.success && parsed.data.requeue ? "Prompt returned to queue/draft." : "Prompt discarded.",
      });
    }

    // 2. Resilient fallback: execute directly if RPC is not present
    const admin = getSupabaseAdminClient();
    const newStatus = parsed.success && parsed.data.requeue === false ? "failed" : "draft";

    const { data: prompt, error: fetchErr } = await admin
      .from("prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr || !prompt) {
      return apiError("NOT_FOUND", "Prompt not found or unauthorized", 404);
    }

    const { error: updateErr } = await admin
      .from("prompts")
      .update({ status: newStatus })
      .eq("id", promptId);

    if (updateErr) {
      return apiError("INTERNAL_ERROR", updateErr.message, 500);
    }

    try {
      await admin.from("activity_log").insert({
        user_id: user.id,
        entity_type: "prompt",
        entity_id: promptId,
        action: "rejected",
        metadata: {
          reason: reason || (newStatus === "failed" ? "Discarded" : "Requeued"),
          status: newStatus,
        },
      });
    } catch {}

    return apiSuccess({
      rejected: true,
      promptId,
      message: newStatus === "failed" ? "Prompt discarded." : "Prompt returned to draft.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Rejection failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
