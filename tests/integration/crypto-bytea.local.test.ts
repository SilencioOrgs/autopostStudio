import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { decryptFromBytea, encryptToBytea } from "@/app/_lib/crypto";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";

// This test deliberately only permits a local Supabase URL. It writes a
// disposable auth user and must never target an owner's hosted project.
const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocalSupabase = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(configuredUrl);
const cleanupUserIds: string[] = [];

afterEach(async () => {
  if (!isLocalSupabase) return;

  const admin = getSupabaseAdminClient();
  await Promise.all(cleanupUserIds.splice(0).map((userId) => admin.auth.admin.deleteUser(userId)));
});

describe.skipIf(!isLocalSupabase)("PostgREST bytea integration", () => {
  it("writes, reads, and decrypts a provider key ciphertext", async () => {
    const admin = getSupabaseAdminClient();
    const email = `crypto-${crypto.randomUUID()}@example.test`;
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomBytes(24).toString("base64url"),
      email_confirm: true,
    });

    expect(userError).toBeNull();
    expect(created.user).not.toBeNull();
    const userId = created.user!.id;
    cleanupUserIds.push(userId);

    const plaintext = "local-test-provider-key";
    const ciphertext = encryptToBytea(plaintext, `provider_keys:${userId}`);
    const { error: insertError } = await admin.from("provider_keys").insert({
      user_id: userId,
      provider: "google_ai_studio",
      key_ciphertext: ciphertext,
      key_last4: "-key",
      status: "valid",
    });
    expect(insertError).toBeNull();

    const { data: row, error: readError } = await admin
      .from("provider_keys")
      .select("key_ciphertext")
      .eq("user_id", userId)
      .single();

    expect(readError).toBeNull();
    expect(row?.key_ciphertext).toMatch(/^\\x[0-9a-f]+$/i);
    expect(decryptFromBytea(row!.key_ciphertext, `provider_keys:${userId}`)).toBe(plaintext);
  });
});
