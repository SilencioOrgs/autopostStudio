import crypto from "crypto";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { runWorkerTick } from "@/app/_lib/services/queue";

/**
 * POST /api/queue/process
 * Authenticated endpoint allowing the dashboard UI to trigger immediate processing of queued generation jobs.
 */
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to process the generation queue.", 401);
    }

    const workerId = `user-${user.id.slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
    const result = await runWorkerTick(workerId, 5);

    return apiSuccess({
      workerId,
      timestamp: new Date().toISOString(),
      ...result,
      message:
        result.processedJobs > 0
          ? `Processed ${result.processedJobs} job(s) (${result.succeeded} succeeded, ${result.failed} failed).`
          : "Queue is empty or all eligible jobs are currently running.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process queue";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
