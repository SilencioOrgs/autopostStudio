import "server-only";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { encryptToBytea, getLast4, maskKey, decryptFromBytea } from "@/app/_lib/crypto";
import { verifyGoogleAiKey } from "@/app/_lib/ai/gemini";

export interface SaveProviderKeyInput {
  provider: "google_ai_studio";
  apiKey: string;
}

export async function saveProviderKey(userId: string, input: SaveProviderKeyInput) {
  const cleanKey = input.apiKey.trim();
  const verification = await verifyGoogleAiKey(cleanKey);
  if (!verification.valid) {
    const err = new Error(verification.errorMessage || "Google AI Studio key verification failed");
    (err as unknown as { errorCode: string }).errorCode = verification.errorCode || "AI_KEY_INVALID";
    throw err;
  }

  const ciphertext = encryptToBytea(cleanKey, `provider_keys:${userId}`);
  const last4 = getLast4(cleanKey);

  const admin = getSupabaseAdminClient();
  const { data: savedKey, error } = await admin
    .from("provider_keys")
    .upsert(
      {
        user_id: userId,
        provider: input.provider,
        key_ciphertext: ciphertext,
        key_last4: last4,
        status: "valid",
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select("id, provider, key_last4, status, last_verified_at, created_at, updated_at")
    .single();

  if (error || !savedKey) {
    throw new Error(error?.message || "Failed to store provider key");
  }

  // Clear generation_paused on save (union of behaviors)
  await admin
    .from("profiles")
    .update({ generation_paused: false, generation_paused_until: null })
    .eq("id", userId);

  return {
    providerKey: savedKey,
    keyLast4: savedKey.key_last4,
    maskedKey: maskKey(cleanKey),
    status: savedKey.status,
    lastVerifiedAt: savedKey.last_verified_at,
  };
}

export async function deleteProviderKey(userId: string, provider: "google_ai_studio") {
  const admin = getSupabaseAdminClient();

  // 1. Cancel queued generation jobs for this user
  const { count: cancelledCount } = await admin
    .from("jobs")
    .update({ status: "cancelled" }, { count: "exact" })
    .eq("user_id", userId)
    .eq("type", "generate_image")
    .eq("status", "queued");

  // 2. Reset prompts that were queued back to draft
  await admin
    .from("prompts")
    .update({ status: "draft" })
    .eq("user_id", userId)
    .eq("status", "queued");

  // 3. Delete the key row
  const { error } = await admin
    .from("provider_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    throw new Error(error.message);
  }

  return {
    cancelledJobs: cancelledCount || 0,
  };
}

export function decryptProviderKey(ciphertext: string, userId: string): string {
  return decryptFromBytea(ciphertext, `provider_keys:${userId}`);
}
