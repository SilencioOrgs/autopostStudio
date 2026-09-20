import crypto from "crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { encryptToBytea, decryptFromBytea, encrypt, decrypt, getLast4, maskKey } from "@/app/_lib/crypto";

// Ensure environment variable is populated for tests
beforeAll(() => {
  if (!process.env.ENCRYPTION_KEY) {
    // 32-byte dummy key for tests: 32 bytes of 'a' base64 encoded
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, "a").toString("base64");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key-with-at-least-20-chars";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key-with-at-least-20-chars";
  }
  if (!process.env.CRON_SECRET) {
    process.env.CRON_SECRET = "012345678901234567890123456789012";
  }
});

describe("AES-256-GCM Crypto with Versioned Envelope & Bytea", () => {
  it("encrypts and decrypts round-trip without AAD", () => {
    const secret = "EAABsb1234567890abcdef";
    const bytea = encryptToBytea(secret);
    expect(bytea.startsWith("\\x")).toBe(true);

    const decrypted = decryptFromBytea(bytea);
    expect(decrypted).toBe(secret);
  });

  it("encrypts and decrypts round-trip with AAD (table:user_id)", () => {
    const secret = "AIzaSySecretToken_12345";
    const aad = "provider_keys:usr_abc_123";
    const bytea = encryptToBytea(secret, aad);

    // Decrypt with matching AAD succeeds
    const decrypted = decryptFromBytea(bytea, aad);
    expect(decrypted).toBe(secret);
  });

  it("fails decryption if AAD does not match (row relocation tamper)", () => {
    const secret = "TopSecretPageToken";
    const originalAad = "facebook_pages:usr_victim";
    const bytea = encryptToBytea(secret, originalAad);

    const attackerAad = "facebook_pages:usr_attacker";
    expect(() => {
      decryptFromBytea(bytea, attackerAad);
    }).toThrow();
  });

  it("fails decryption if ciphertext byte is flipped (tamper detection)", () => {
    const secret = "ImportantData";
    const bytea = encryptToBytea(secret);
    // Tamper with hex string (modify a character in the ciphertext portion)
    const tampered = bytea.slice(0, -2) + (bytea.slice(-2) === "00" ? "11" : "00");

    expect(() => {
      decryptFromBytea(tampered);
    }).toThrow();
  });

  it("fails decryption when an envelope was encrypted with a different key", () => {
    const wrongKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", wrongKey, iv);
    const ciphertext = Buffer.concat([cipher.update("wrong-key-test", "utf8"), cipher.final()]);
    const envelope = Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);

    expect(() => decryptFromBytea(envelope)).toThrow();
  });

  it("accepts bare hex without \\x prefix", () => {
    const secret = "BareHexTest";
    const bytea = encryptToBytea(secret);
    const bareHex = bytea.replace(/^\\+x/, "");

    const decrypted = decryptFromBytea(bareHex);
    expect(decrypted).toBe(secret);
  });

  it("accepts Buffer directly and supports decrypt wrapper", () => {
    const secret = "BufferTest";
    const buf = encrypt(secret);
    const decrypted = decryptFromBytea(buf);
    expect(decrypted).toBe(secret);
    expect(decrypt(buf)).toBe(secret);
  });

  it("rejects truncated input (too short)", () => {
    expect(() => {
      decryptFromBytea("\\x01020304"); // 4 bytes, header requires 29 bytes
    }).toThrow(/too short/);
  });

  it("rejects unsupported envelope version", () => {
    // Create a 30-byte buffer with version = 2
    const invalidVersionBuf = Buffer.alloc(35, 0);
    invalidVersionBuf[0] = 2; // version 2

    expect(() => {
      decryptFromBytea(invalidVersionBuf);
    }).toThrow(/Unsupported ciphertext version: 2/);
  });

  it("extracts last 4 characters safely", () => {
    expect(getLast4("AIzaSy1234")).toBe("1234");
    expect(getLast4("abc")).toBe("abc");
    expect(getLast4("  5678  ")).toBe("5678");
  });

  it("masks keys securely", () => {
    expect(maskKey("AIzaSy1234567890abcd")).toBe("AIza••••••abcd");
    expect(maskKey("short")).toBe("••••••••");
  });
});
