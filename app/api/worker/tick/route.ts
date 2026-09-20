import { type NextRequest } from "next/server";
import crypto from "crypto";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { runWorkerTick } from "@/app/_lib/services/queue";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return apiError("AUTH_UNAUTHORIZED", "Unauthorized: Invalid cron worker bearer token.", 401);
    }

    const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
    const result = await runWorkerTick(workerId, 5);

    return apiSuccess({
      workerId,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Worker tick execution failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
