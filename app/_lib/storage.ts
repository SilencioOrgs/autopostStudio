import "server-only";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";

/**
 * Creates signed URLs for storage paths in the private 'generated-images' bucket in a single batch.
 * Returns a map of storage_path -> signedUrl.
 */
export async function signImages(
  paths: (string | null | undefined)[],
  expiresInSeconds = 3600
): Promise<Record<string, string>> {
  const cleanPaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p && p.trim()))));
  if (cleanPaths.length === 0) {
    return {};
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("generated-images")
    .createSignedUrls(cleanPaths, expiresInSeconds);

  if (error || !data) {
    console.error("Failed to create signed URLs batch:", error?.message);
    return {};
  }

  const result: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) {
      result[item.path] = item.signedUrl;
    }
  }

  return result;
}

/**
 * Signs a single image storage path.
 */
export async function signImage(
  path: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path || !path.trim()) return null;
  const map = await signImages([path], expiresInSeconds);
  return map[path] || null;
}
