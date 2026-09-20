import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation.
 * Fails closed: throws with the variable name on invalid config, never its value.
 */

const ServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .startsWith("https://", "NEXT_PUBLIC_SUPABASE_URL must use https"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is too short"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, "SUPABASE_SERVICE_ROLE_KEY is too short"),
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY is required")
    .refine(
      (v) => {
        try {
          return Buffer.from(v, "base64").length === 32;
        } catch {
          return false;
        }
      },
      { message: "ENCRYPTION_KEY must decode to exactly 32 bytes (base64)" }
    ),
  CRON_SECRET: z
    .string()
    .min(32, "CRON_SECRET must be at least 32 characters"),
  CLOUDFLARE_ACCOUNT_ID: z.string().default(""),
  CLOUDFLARE_API_TOKEN: z.string().default(""),
  GRAPH_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/, "GRAPH_API_VERSION must match vN.N (e.g. v26.0)")
    .default("v26.0"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL")
    .default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Returns validated server environment variables.
 * Cached after first call. Throws on invalid config with the variable name only.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const result = ServerEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    GRAPH_API_VERSION: process.env.GRAPH_API_VERSION,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${issues}`);
  }

  cached = result.data;
  return cached;
}

/**
 * Convenience accessors for commonly needed values.
 */
export function getEncryptionKeyBuffer(): Buffer {
  const env = getServerEnv();
  return Buffer.from(env.ENCRYPTION_KEY, "base64");
}

export function getCronSecret(): string {
  return getServerEnv().CRON_SECRET;
}

export function getGraphApiVersion(): string {
  return getServerEnv().GRAPH_API_VERSION;
}

export function getSiteUrl(): string {
  return getServerEnv().NEXT_PUBLIC_SITE_URL;
}

export function getCloudflareAccountId(): string {
  const id = getServerEnv().CLOUDFLARE_ACCOUNT_ID;
  if (!id) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured");
  }
  return id;
}

export function getCloudflareApiToken(): string {
  const token = getServerEnv().CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured");
  }
  return token;
}
