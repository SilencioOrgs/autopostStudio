import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { jobId } = await params;
    const supabase = await createClient();

    // 1. Fetch job to get prompt_id
    const { data: job, error: fetchErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !job) {
      return apiError("NOT_FOUND", "Job not found.", 404);
    }

    // 2. Mark job cancelled
    await supabase
      .from("jobs")
      .update({ status: "cancelled" })
      .eq("id", jobId);

    // 3. Reset prompt back to draft
    const promptId = (job.payload as { prompt_id?: string })?.prompt_id;
    if (promptId) {
      await supabase
        .from("prompts")
        .update({ status: "draft" })
        .eq("id", promptId)
        .eq("user_id", user.id);
    }

    return apiSuccess({ cancelled: true, jobId, message: "Job cancelled successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel job";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
