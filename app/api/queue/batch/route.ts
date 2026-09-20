import { type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const EnqueueBatchSchema = z
  .object({
    promptIds: z.array(z.string().uuid()).min(1, "At least one prompt ID is required"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to enqueue generation.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = EnqueueBatchSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { promptIds } = parsed.data;
    const supabase = await createClient();

    // 1. Mandatory Gate: Verify user has an active, verified Google AI Studio key (§6.4)
    const { data: keyRecord } = await supabase
      .from("provider_keys")
      .select("status")
      .eq("user_id", user.id)
      .eq("provider", "google_ai_studio")
      .maybeSingle();

    if (!keyRecord || keyRecord.status !== "valid") {
      return apiError(
        "AI_KEY_MISSING",
        "A verified Google AI Studio key is required to generate images. Please add your key in Settings before queueing.",
        400
      );
    }

    // 2. Fetch eligible prompts owned by this user
    const { data: prompts } = await supabase
      .from("prompts")
      .select("id, status")
      .in("id", promptIds)
      .eq("user_id", user.id);

    if (!prompts || prompts.length === 0) {
      return apiError("NOT_FOUND", "No eligible prompts found to enqueue.", 404);
    }

    const validPromptIds = prompts.map((p) => p.id);

    // 3. Create jobs rows (no secret keys in payload per §6.4)
    const jobsToInsert = validPromptIds.map((promptId) => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      type: "generate_image" as const,
      payload: { prompt_id: promptId, user_id: user.id },
      status: "queued" as const,
      priority: 0,
      attempts: 0,
      max_attempts: 3,
      run_after: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { error: jobsError } = await supabase.from("jobs").insert(jobsToInsert);
    if (jobsError) {
      return apiError("INTERNAL_ERROR", jobsError.message, 500);
    }

    // 4. Update prompts status to 'queued'
    await supabase
      .from("prompts")
      .update({ status: "queued" })
      .in("id", validPromptIds)
      .eq("user_id", user.id);

    return apiSuccess({
      enqueued: validPromptIds.length,
      message: `Enqueued ${validPromptIds.length} prompts for image generation.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to enqueue batch";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
