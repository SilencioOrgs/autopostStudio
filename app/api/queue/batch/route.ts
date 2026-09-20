import { type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { runWorkerTick } from "@/app/_lib/services/queue";

const EnqueueBatchSchema = z
  .object({
    promptIds: z.array(z.string().uuid()).min(1, "At least one prompt ID is required"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return apiError("AUTH_UNAUTHORIZED", "Please sign in to enqueue generation.", 401);

    const json = await request.json().catch(() => null);
    if (!json) return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);

    const parsed = EnqueueBatchSchema.safeParse(json);
    if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);

    const supabase = await createClient();
    const { data: prompts } = await supabase
      .from("prompts")
      .select("id")
      .in("id", parsed.data.promptIds)
      .eq("user_id", user.id);

    if (!prompts || prompts.length === 0) {
      return apiError("NOT_FOUND", "No eligible prompts found to enqueue.", 404);
    }

    const validPromptIds = prompts.map((prompt) => prompt.id);
    const now = new Date().toISOString();
    const jobsToInsert = validPromptIds.map((promptId) => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      type: "generate_image" as const,
      payload: { prompt_id: promptId, user_id: user.id },
      status: "queued" as const,
      priority: 0,
      attempts: 0,
      max_attempts: 3,
      run_after: now,
      created_at: now,
    }));

    const { error: jobsError } = await supabase.from("jobs").insert(jobsToInsert);
    if (jobsError) return apiError("INTERNAL_ERROR", jobsError.message, 500);

    await supabase
      .from("prompts")
      .update({ status: "queued" })
      .in("id", validPromptIds)
      .eq("user_id", user.id);

    // Auto-trigger worker execution in background so jobs run immediately
    const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
    runWorkerTick(workerId, 5).catch((err) => {
      console.error("Auto worker tick failed:", err);
    });

    return apiSuccess({
      enqueued: validPromptIds.length,
      message: `Enqueued ${validPromptIds.length} prompts for Cloudflare image generation.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to enqueue batch";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
