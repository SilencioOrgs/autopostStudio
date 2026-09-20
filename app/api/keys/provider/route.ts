import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { saveProviderKey, deleteProviderKey } from "@/app/_lib/services/provider";

const ProviderKeySchema = z
  .object({
    provider: z.literal("google_ai_studio").default("google_ai_studio"),
    apiKey: z.string().min(10, "Google AI Studio API key appears too short"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to configure AI credentials", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = ProviderKeySchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400);
    }

    const { provider, apiKey } = parsed.data;

    try {
      const result = await saveProviderKey(user.id, { provider, apiKey });
      return apiSuccess({
        providerKey: result.providerKey,
        keyLast4: result.keyLast4,
        maskedKey: result.maskedKey,
        status: result.status,
        lastVerifiedAt: result.lastVerifiedAt,
        message: "Google AI Studio API key verified and encrypted securely.",
      });
    } catch (saveErr: unknown) {
      const errorCode = (saveErr as { errorCode?: string })?.errorCode;
      const message = saveErr instanceof Error ? saveErr.message : "Failed to save AI provider key";
      if (errorCode) {
        return apiError(errorCode, message, 400);
      }
      return apiError("INTERNAL_ERROR", message, 500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save AI provider key";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to continue", 401);
    }

    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get("provider") as "google_ai_studio") || "google_ai_studio";

    try {
      const { cancelledJobs } = await deleteProviderKey(user.id, provider);
      return apiSuccess({
        removed: true,
        cancelledJobs,
        message: `Google AI Studio credentials removed.${
          cancelledJobs ? ` ${cancelledJobs} queued generation jobs were cancelled.` : ""
        }`,
      });
    } catch (delErr: unknown) {
      const msg = delErr instanceof Error ? delErr.message : "Failed to remove AI provider key";
      return apiError("INTERNAL_ERROR", msg, 500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove AI provider key";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
