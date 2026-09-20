import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { decryptFromBytea } from "@/app/_lib/crypto";
import { generatePromptsFromTopic } from "@/app/_lib/ai/gemini";

const GeneratePromptsSchema = z
  .object({
    topic: z.string().min(2, "Topic is required").max(200),
    style: z.string().max(100).optional(),
    count: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to use the AI Prompt Assistant.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = GeneratePromptsSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { topic, style = "Modern Architecture", count = 3 } = parsed.data;

    const admin = getSupabaseAdminClient();

    // 1. Fetch user's Google AI Studio key using admin client
    const { data: keyRecord } = await admin
      .from("provider_keys")
      .select("key_ciphertext, status")
      .eq("user_id", user.id)
      .eq("provider", "google_ai_studio")
      .maybeSingle();

    if (!keyRecord || keyRecord.status !== "valid") {
      return apiError(
        "AI_KEY_MISSING",
        "A verified Google AI Studio key is required to generate prompts. Please add your key in Settings.",
        400
      );
    }

    // 2. Decrypt key in-memory with AAD
    const apiKey = decryptFromBytea(keyRecord.key_ciphertext, `provider_keys:${user.id}`);

    // 3. Generate prompts via Gemini text call
    const prompts = await generatePromptsFromTopic({
      topic,
      style,
      count,
      apiKey,
    });

    return apiSuccess({
      topic,
      style,
      count: prompts.length,
      prompts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
