import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to view the queue.", 401);
    }

    const supabase = await createClient();

    // 1. Get user profile generation_paused flag
    const { data: profile } = await supabase
      .from("profiles")
      .select("generation_paused")
      .eq("id", user.id)
      .single();

    // 2. Fetch jobs with prompt and generation details
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    // 3. Collect prompt IDs to fetch prompt titles / styles
    const promptIds = (jobs || [])
      .map((j) => (j.payload as { prompt_id?: string })?.prompt_id)
      .filter((id): id is string => Boolean(id));

    const promptMap = new Map<string, { image_prompt: string; style: string | null; aspect: string }>();
    if (promptIds.length > 0) {
      const { data: prompts } = await supabase
        .from("prompts")
        .select("id, image_prompt, style, aspect")
        .in("id", promptIds);

      (prompts || []).forEach((p) => {
        promptMap.set(p.id, {
          image_prompt: p.image_prompt,
          style: p.style,
          aspect: p.aspect,
        });
      });
    }

    const enrichedJobs = (jobs || []).map((job) => {
      const pId = (job.payload as { prompt_id?: string })?.prompt_id;
      const promptInfo = pId ? promptMap.get(pId) : null;
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        runAfter: job.run_after,
        lockedAt: job.locked_at,
        lastError: job.last_error,
        createdAt: job.created_at,
        promptId: pId,
        promptSnippet: promptInfo?.image_prompt || "Prompt generation",
        style: promptInfo?.style || "Standard",
        aspect: promptInfo?.aspect || "4:5",
      };
    });

    return apiSuccess({
      generationPaused: profile?.generation_paused ?? false,
      jobs: enrichedJobs,
      activeCount: enrichedJobs.filter((j) => ["queued", "running"].includes(j.status)).length,
      completedCount: enrichedJobs.filter((j) => j.status === "succeeded").length,
      failedCount: enrichedJobs.filter((j) => j.status === "failed").length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load queue";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
