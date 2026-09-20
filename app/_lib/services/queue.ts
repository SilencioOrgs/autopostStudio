import "server-only";
import crypto from "crypto";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { generateCloudflareImage } from "@/app/_lib/ai/cloudflare";
import { DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";
import type { Database } from "@/app/_lib/db/types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export interface WorkerTickResult {
  reapedJobs: number;
  processedJobs: number;
  succeeded: number;
  failed: number;
  pausedUsers: string[];
}

/**
 * Reaps any jobs stuck in 'running' state for longer than 10 minutes.
 */
export async function reapStuckJobs(): Promise<number> {
  const admin = getSupabaseAdminClient();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Find stuck jobs
  const { data: stuckJobs } = await admin
    .from("jobs")
    .select("id, attempts, max_attempts")
    .eq("status", "running")
    .lt("locked_at", tenMinutesAgo);

  if (!stuckJobs || stuckJobs.length === 0) return 0;

  let reaped = 0;
  for (const job of stuckJobs) {
    const nextAttempts = job.attempts + 1;
    if (nextAttempts >= job.max_attempts) {
      await admin
        .from("jobs")
        .update({
          status: "failed",
          last_error: "Job timed out in running state and exceeded max retry attempts.",
        })
        .eq("id", job.id);
    } else {
      await admin
        .from("jobs")
        .update({
          status: "queued",
          attempts: nextAttempts,
          locked_at: null,
          locked_by: null,
          run_after: new Date(Date.now() + 5000).toISOString(),
        })
        .eq("id", job.id);
    }
    reaped++;
  }

  return reaped;
}

/**
 * Claims a bounded batch of queued jobs using atomic lock.
 */
export async function claimJobs(batchSize = 5, workerId: string): Promise<JobRow[]> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

  // 1. Check which users have generation_paused = true
  const { data: pausedProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("generation_paused", true);

  const pausedUserIds = new Set((pausedProfiles || []).map((p) => p.id));

  // 2. Fetch candidates ready to run
  const { data: candidates } = await admin
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .lte("run_after", now)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(batchSize * 3);

  if (!candidates || candidates.length === 0) return [];

  // Filter out jobs for paused users or exceeding per-user concurrency cap (3)
  const eligibleJobIds: string[] = [];
  const userRunningCounts = new Map<string, number>();

  // Count active running jobs per user
  const { data: runningJobs } = await admin
    .from("jobs")
    .select("user_id")
    .eq("status", "running");

  (runningJobs || []).forEach((j) => {
    userRunningCounts.set(j.user_id, (userRunningCounts.get(j.user_id) || 0) + 1);
  });

  for (const job of candidates) {
    if (pausedUserIds.has(job.user_id)) continue;

    const currentRunning = userRunningCounts.get(job.user_id) || 0;
    if (currentRunning >= 3) continue; // per-user concurrency cap

    eligibleJobIds.push(job.id);
    userRunningCounts.set(job.user_id, currentRunning + 1);

    if (eligibleJobIds.length >= batchSize) break;
  }

  if (eligibleJobIds.length === 0) return [];

  // Atomically lock eligible jobs
  const { data: claimed } = await admin
    .from("jobs")
    .update({
      status: "running",
      locked_at: now,
      locked_by: workerId,
    })
    .in("id", eligibleJobIds)
    .eq("status", "queued") // concurrency check
    .select();

  return claimed || [];
}

/**
 * Executes a single image generation job.
 */
export async function executeGenerateImageJob(job: JobRow): Promise<void> {
  const admin = getSupabaseAdminClient();
  const payload = job.payload as { prompt_id: string; user_id: string };
  const promptId = payload?.prompt_id;
  const userId = job.user_id;

  if (!promptId || !userId) {
    await admin
      .from("jobs")
      .update({ status: "failed", last_error: "Malformed job payload: missing prompt_id or user_id" })
      .eq("id", job.id);
    return;
  }

  // 1. Fetch prompt and style preset. Cloudflare credentials are server-managed.
  const { data: prompt } = await admin
    .from("prompts")
    .select("*")
    .eq("id", promptId)
    .single();

  if (!prompt) {
    await admin.from("jobs").update({ status: "failed", last_error: "Prompt record not found." }).eq("id", job.id);
    return;
  }

  // Fetch style preset from user profile or default
  let profileModel: string | null = null;
  const { data: profileWithModel, error: profileErr } = await admin
    .from("profiles")
    .select("default_style_preset, image_model")
    .eq("id", userId)
    .maybeSingle();

  let resolvedProfile = profileWithModel;
  if (profileErr) {
    const { data: baseProfile } = await admin
      .from("profiles")
      .select("default_style_preset")
      .eq("id", userId)
      .maybeSingle();
    resolvedProfile = baseProfile as typeof profileWithModel;
  } else {
    profileModel = profileWithModel?.image_model || null;
  }

  if (!profileModel) {
    const { data: authData } = await admin.auth.admin.getUserById(userId);
    profileModel = (authData?.user?.user_metadata?.image_model as string | undefined) || null;
  }

  const systemInstruction =
    prompt.style || resolvedProfile?.default_style_preset || "Modern architectural photography, photorealistic, 8k";

  const generationId = crypto.randomUUID();
  const modelName = profileModel || DEFAULT_IMAGE_MODEL;

  // Mark prompt generating
  await admin.from("prompts").update({ status: "generating" }).eq("id", promptId);

  try {
    // 2. Call Cloudflare Workers AI REST API directly. No user-supplied provider key is used.
    const result = await generateCloudflareImage({
      prompt: prompt.image_prompt,
      systemInstruction,
      aspect: prompt.aspect || "4:5",
      model: modelName,
    });

    // 4. Stream output buffer directly to Supabase Storage
    const storagePath = `${userId}/${prompt.set_id || "general"}/${prompt.id}-${generationId}.png`;
    const { error: storageError } = await admin.storage
      .from("generated-images")
      .upload(storagePath, result.bytes, {
        contentType: result.mimeType || "image/png",
        upsert: true,
      });

    if (storageError) {
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    // 5. Record generations table row
    await admin.from("generations").insert({
      id: generationId,
      user_id: userId,
      prompt_id: promptId,
      job_id: job.id,
      model: result.model,
      system_instruction: systemInstruction,
      aspect: prompt.aspect || "4:5",
      image_size: "1K",
      storage_path: storagePath,
      bytes: result.bytes.length,
      latency_ms: result.latencyMs,
      status: "succeeded",
      attempt: job.attempts + 1,
      created_at: new Date().toISOString(),
    });

    // 6. Update prompt to ready
    await admin
      .from("prompts")
      .update({ status: "ready" })
      .eq("id", promptId);

    // 7. Mark job succeeded
    await admin
      .from("jobs")
      .update({ status: "succeeded" })
      .eq("id", job.id);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorCode = (err as unknown as { code?: string })?.code || "AI_GENERATION_FAILED";
    const errorStatus = (err as unknown as { status?: number })?.status || 500;

    // Handle 429 Quota Exhaustion
    if (errorStatus === 429 || errorCode === "AI_QUOTA_EXCEEDED") {
      // Pause this user's queue and reschedule pending jobs for +15 min
      await admin.from("profiles").update({ generation_paused: true }).eq("id", userId);

      const resumeTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await admin
        .from("jobs")
        .update({
          status: "queued",
          locked_at: null,
          locked_by: null,
          run_after: resumeTime,
          last_error: "Cloudflare Workers AI is temporarily rate limited. Scheduled auto-resume in 15 minutes.",
        })
        .eq("user_id", userId)
        .in("status", ["queued", "running"]);

      await admin.from("prompts").update({ status: "queued" }).eq("id", promptId);
      return;
    }

    // Non-retryable errors (400 bad prompt, 401/403 bad key)
    const isNonRetryable = [400, 401, 403].includes(errorStatus);
    const currentAttempt = job.attempts + 1;

    if (isNonRetryable || currentAttempt >= job.max_attempts) {
      // Permanent failure
      await admin
        .from("jobs")
        .update({
          status: "failed",
          attempts: currentAttempt,
          last_error: errorMsg,
        })
        .eq("id", job.id);

      await admin.from("prompts").update({ status: "failed" }).eq("id", promptId);

      // Record failed generation
      await admin.from("generations").insert({
        id: generationId,
        user_id: userId,
        prompt_id: promptId,
        job_id: job.id,
        model: modelName,
        system_instruction: systemInstruction,
        aspect: prompt.aspect || "4:5",
        image_size: "1K",
        status: "failed",
        error_code: errorCode,
        error_message: errorMsg,
        attempt: currentAttempt,
        created_at: new Date().toISOString(),
      });
    } else {
      // Exponential backoff: 2s, 8s, 30s
      const delaySec = currentAttempt === 1 ? 2 : currentAttempt === 2 ? 8 : 30;
      await admin
        .from("jobs")
        .update({
          status: "queued",
          attempts: currentAttempt,
          locked_at: null,
          locked_by: null,
          run_after: new Date(Date.now() + delaySec * 1000).toISOString(),
          last_error: `Transient error (${errorMsg}). Retrying in ${delaySec}s...`,
        })
        .eq("id", job.id);
    }
  }
}

/**
 * Runs one worker tick: reaps stuck jobs, claims batch, and executes jobs.
 */
export async function runWorkerTick(workerId: string, limit = 5): Promise<WorkerTickResult> {
  const reapedJobs = await reapStuckJobs();
  const claimed = await claimJobs(limit, workerId);

  let succeeded = 0;
  let failed = 0;

  for (const job of claimed) {
    if (job.type === "generate_image") {
      await executeGenerateImageJob(job);
      const admin = getSupabaseAdminClient();
      const { data: updated } = await admin.from("jobs").select("status").eq("id", job.id).single();
      if (updated?.status === "succeeded") succeeded++;
      else if (updated?.status === "failed") failed++;
    }
  }

  return {
    reapedJobs,
    processedJobs: claimed.length,
    succeeded,
    failed,
    pausedUsers: [],
  };
}
