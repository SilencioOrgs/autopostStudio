import { type NextRequest } from "next/server";
import crypto from "crypto";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { runWorkerTick } from "@/app/_lib/services/queue";
import { getCronSecret } from "@/app/_lib/env";

export const maxDuration = 60;

function hasValidCronSecret(request: NextRequest) {
  let expected: string;
  try {
    expected = getCronSecret();
  } catch {
    return false;
  }
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/, "") ?? "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function tick(request: NextRequest) {
  try {
    if (!hasValidCronSecret(request)) {
      return apiError("AUTH_UNAUTHORIZED", "Unauthorized.", 401);
    }

    const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
    const result = await runWorkerTick(workerId, 5);

    return apiSuccess({
      workerId,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    console.error("Worker tick failed", err);
    return apiError("INTERNAL_ERROR", undefined, 500);
  }
}

export async function POST(request: NextRequest) { return tick(request); }
export async function GET(request: NextRequest) { return tick(request); }
