import "server-only";
import crypto from "crypto";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { generateCloudflareImage } from "@/app/_lib/ai/cloudflare";
import { DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";
import { decryptPageToken, publishPostToFacebook } from "@/app/_lib/services/facebook";
import type { Database } from "@/app/_lib/db/types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export interface WorkerTickResult {
  reapedJobs: number;
  processedJobs: number;
  succeeded: number;
  failed: number;
  pausedUsers: string[];
  publishedPosts: number;
  failedPosts: number;
}

async function publishDuePosts(limit = 5) {
  const admin = getSupabaseAdminClient();
  const { data: candidates, error } = await admin
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_publish_time", new Date().toISOString())
    .order("scheduled_publish_time", { ascending: true })
    .limit(limit);
  if (error) throw new Error("Could not find due posts");

  let published = 0;
  let failed = 0;
  for (const candidate of candidates || []) {
    // Compare-and-set is the idempotency guard: only one worker can own a post.
    const { data: post } = await admin
      .from("posts")
      .update({ status: "publishing", last_attempt_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .eq("status", "scheduled")
      .select("*")
      .maybeSingle();
    if (!post) continue;

    try {
      if (!post.facebook_page_id || !post.generation_id) throw new Error("Missing publication data");
      const [{ data: page }, { data: generation }] = await Promise.all([
        admin.from("facebook_pages").select("*").eq("id", post.facebook_page_id).eq("user_id", post.user_id).maybeSingle(),
        admin.from("generations").select("storage_path").eq("id", post.generation_id).eq("user_id", post.user_id).maybeSingle(),
      ]);
      if (!page || page.token_status !== "valid" || !generation?.storage_path) throw new Error("Missing active page or image");
      const { data: file, error: downloadError } = await admin.storage.from("generated-images").download(generation.storage_path);
      if (downloadError || !file) throw new Error("Image unavailable");
      const result = await publishPostToFacebook({
        pageId: page.page_id,
        token: decryptPageToken(page.token_ciphertext, post.user_id),
        message: post.caption_final || "Published via AutoPost Studio",
        imageBuffer: Buffer.from(await file.arrayBuffer()),
        imageMimeType: file.type || "image/png",
        scheduledPublishTime: null,
      });
      await admin.from("posts").update({
        status: "published", published_at: result.publishedAt || new Date().toISOString(),
        fb_post_id: result.fbPostId, fb_photo_id: result.fbPhotoId, fb_mode: "immediate",
        publish_attempts: post.publish_attempts + 1, error_code: null, error_message: null,
      }).eq("id", post.id).eq("status", "publishing");
      if (post.card_id) await admin.from("board_cards").update({ status: "published" }).eq("id", post.card_id);
      if (post.prompt_id) await admin.from("prompts").update({ status: "posted" }).eq("id", post.prompt_id);
      published++;
    } catch (cause) {
      console.error("Scheduled publication failed", { postId: post.id, cause });
      await admin.from("posts").update({
        status: "failed", publish_attempts: post.publish_attempts + 1,
        error_code: "PUBLISH_FAILED", error_message: "Publication failed. Retry from Posts after checking your Page connection.",
      }).eq("id", post.id).eq("status", "publishing");
      if (post.card_id) await admin.from("board_cards").update({ status: "failed" }).eq("id", post.card_id);
      failed++;
    }
  }
  return { published, failed };
}

/**
 * Reaps any jobs stuck in 'running' state for longer than 10 minutes.
 */
export async function reapStuckJobs(): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("reap_stuck_jobs");
  if (error) throw new Error("Could not reap stuck jobs");
  return Number(data ?? 0);
}

/**
 * Claims a bounded batch of queued jobs using atomic lock.
 */
export async function claimJobs(batchSize = 5, workerId: string): Promise<JobRow[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_jobs", {
    p_worker: workerId,
    p_batch: Math.min(Math.max(batchSize, 1), 10),
    p_per_user: 3,
  });
  if (error) throw new Error("Could not claim generation jobs");
  return (data || []) as JobRow[];
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
      const resumeTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await admin.from("profiles").update({ generation_paused_until: resumeTime }).eq("id", userId);
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

  const postResult = await publishDuePosts(limit);

  return {
    reapedJobs,
    processedJobs: claimed.length,
    succeeded,
    failed,
    pausedUsers: [],
    publishedPosts: postResult.published,
    failedPosts: postResult.failed,
  };
}
