import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { requireSameOrigin } from "@/app/_lib/api-security";

const EnqueueBatchSchema = z
  .object({
    promptIds: z.array(z.string().uuid()).min(1, "At least one prompt ID is required").max(100, "Select no more than 100 prompts"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
    const user = await getAuthUser();
    if (!user) return apiError("AUTH_UNAUTHORIZED", "Please sign in to enqueue generation.", 401);

    const json = await request.json().catch(() => null);
    if (!json) return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);

    const parsed = EnqueueBatchSchema.safeParse(json);
    if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);

    const supabase = await createClient();
    const { data: result, error } = await supabase.rpc("enqueue_generation_prompts", {
      p_prompt_ids: parsed.data.promptIds,
    });
    if (error) {
      console.error("Could not enqueue generation prompts", error);
      return apiError("VALIDATION_ERROR", "Only draft or failed prompts can be queued. Apply the runtime safety migration if this persists.", 409);
    }
    const summary = result as { queued?: number; skipped?: number } | null;

    return apiSuccess({
      enqueued: summary?.queued ?? 0,
      skipped: summary?.skipped ?? 0,
      message: summary?.queued
        ? `Enqueued ${summary.queued} prompt${summary.queued === 1 ? "" : "s"} for image generation.`
        : "Nothing was queued. Generated, queued, scheduled, and posted prompts are protected from duplicate generation.",
    });
  } catch (err: unknown) {
    console.error("Queue batch failed", err);
    return apiError("INTERNAL_ERROR", undefined, 500);
  }
}
