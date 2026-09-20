import "server-only";
import { encryptToBytea, decryptFromBytea, getLast4 } from "@/app/_lib/crypto";
import { getGraphApiVersion } from "@/app/_lib/env";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";

export const GRAPH_API_VERSION = getGraphApiVersion();
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface FacebookPageVerificationResult {
  valid: boolean;
  pageId: string;
  pageName: string;
  category: string | null;
  followersCount: number;
  tokenExpiresAt: string | null;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Maps raw Facebook Graph API error codes to stable application error codes and plain messages.
 */
export function mapGraphError(graphError: { code?: number; error_subcode?: number; message?: string }): {
  code: string;
  message: string;
} {
  const code = graphError.code;
  const subcode = graphError.error_subcode;
  const rawMessage = graphError.message || "";

  // Token expired or revoked
  if (code === 190 || subcode === 463 || subcode === 467) {
    return {
      code: "FB_TOKEN_EXPIRED",
      message: "Facebook Page Access Token has expired or was revoked. Please generate a fresh token.",
    };
  }

  // Permissions / Access denied
  if (code === 10 || code === 200 || code === 210) {
    return {
      code: "FB_PERMISSIONS_MISSING",
      message: "The access token lacks required permissions (requires pages_manage_posts and pages_read_engagement).",
    };
  }

  // Not found or invalid Page ID
  if (code === 100 || code === 803 || rawMessage.toLowerCase().includes("does not exist")) {
    return {
      code: "FB_PAGE_NOT_FOUND",
      message: "Facebook Page ID not found. Verify the ID in your Facebook Page settings.",
    };
  }

  // Rate limiting
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return {
      code: "FB_RATE_LIMITED",
      message: "Meta Graph API rate limit reached. Please wait a few minutes before trying again.",
    };
  }

  return {
    code: "FB_TOKEN_INVALID",
    message: "Facebook could not verify these credentials. Please check the Page ID and Access Token.",
  };
}

/**
 * Verifies Page ID and Token with the live Meta Graph API.
 */
export async function verifyFacebookCredentials(
  pageId: string,
  token: string
): Promise<FacebookPageVerificationResult> {
  const cleanId = pageId.trim();
  const cleanToken = token.trim();

  try {
    // 1. Fetch Page info
    const pageUrl = `${GRAPH_BASE_URL}/${encodeURIComponent(cleanId)}?fields=id,name,category,followers_count&access_token=${encodeURIComponent(cleanToken)}`;
    const pageRes = await fetch(pageUrl, { method: "GET" });
    const pageData = await pageRes.json();

    if (!pageRes.ok || pageData.error) {
      const mapped = mapGraphError(pageData.error || {});
      return {
        valid: false,
        pageId: cleanId,
        pageName: "",
        category: null,
        followersCount: 0,
        tokenExpiresAt: null,
        errorCode: mapped.code,
        errorMessage: mapped.message,
      };
    }

    // 2. Fetch permissions to verify publishing capability
    const permUrl = `${GRAPH_BASE_URL}/me/permissions?access_token=${encodeURIComponent(cleanToken)}`;
    const permRes = await fetch(permUrl, { method: "GET" });
    const permData = await permRes.json();

    if (permRes.ok && Array.isArray(permData.data)) {
      const activePermissions = new Set(
        permData.data
          .filter((p: { permission: string; status: string }) => p.status === "granted")
          .map((p: { permission: string }) => p.permission)
      );

      // Check for pages_manage_posts or pages_show_list or pages_read_engagement
      const hasPublishPerm =
        activePermissions.has("pages_manage_posts") ||
        activePermissions.has("pages_show_list") ||
        activePermissions.has("pages_read_engagement");

      if (!hasPublishPerm && activePermissions.size > 0) {
        return {
          valid: false,
          pageId: cleanId,
          pageName: pageData.name || "Facebook Page",
          category: pageData.category || null,
          followersCount: pageData.followers_count || 0,
          tokenExpiresAt: null,
          errorCode: "FB_PERMISSIONS_MISSING",
          errorMessage:
            "This token lacks 'pages_manage_posts' permission. Generate a Page Access Token with full publishing rights.",
        };
      }
    }

    return {
      valid: true,
      pageId: pageData.id || cleanId,
      pageName: pageData.name || "Facebook Page",
      category: pageData.category || null,
      followersCount: pageData.followers_count || 0,
      tokenExpiresAt: null, // Page tokens are typically non-expiring if obtained via system user or long-lived exchange
    };
  } catch {
    return {
      valid: false,
      pageId: cleanId,
      pageName: "",
      category: null,
      followersCount: 0,
      tokenExpiresAt: null,
      errorCode: "FB_TOKEN_INVALID",
      errorMessage: "Could not reach Meta Graph API. Please check your network connection.",
    };
  }
}

/**
 * Encrypts a raw Facebook Access Token for safe database storage.
 */
export function prepareEncryptedToken(token: string, userId?: string): { ciphertext: string; last4: string } {
  const clean = token.trim();
  const ciphertext = encryptToBytea(clean, userId ? `facebook_pages:${userId}` : undefined);
  return {
    ciphertext,
    last4: getLast4(clean),
  };
}

export interface SaveFacebookPageInput {
  pageId: string;
  token: string;
  pageName?: string;
}

/**
 * Verifies credentials, encrypts token with AAD, and saves to database.
 */
export async function saveFacebookPage(userId: string, input: SaveFacebookPageInput) {
  const cleanId = input.pageId.trim();
  const cleanToken = input.token.trim();

  // 1. Verify credentials against Meta Graph API
  const verification = await verifyFacebookCredentials(cleanId, cleanToken);
  if (!verification.valid) {
    const err = new Error(verification.errorMessage || "Failed to verify Facebook Page credentials");
    (err as unknown as { errorCode: string }).errorCode = verification.errorCode || "FB_TOKEN_INVALID";
    throw err;
  }

  // 2. Encrypt token with AAD facebook_pages:<user_id>
  const ciphertext = encryptToBytea(cleanToken, `facebook_pages:${userId}`);
  const last4 = getLast4(cleanToken);
  const finalPageName = input.pageName?.trim() || verification.pageName || "Facebook Page";

  const admin = getSupabaseAdminClient();

  // Check if user has existing pages (if none, make this default)
  const { count } = await admin
    .from("facebook_pages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const isDefault = (count || 0) === 0;

  // 3. Upsert into database
  const { data: page, error } = await admin
    .from("facebook_pages")
    .upsert(
      {
        user_id: userId,
        page_id: verification.pageId,
        page_name: finalPageName,
        category: verification.category,
        followers_count: verification.followersCount,
        token_ciphertext: ciphertext,
        token_last4: last4,
        token_status: "valid",
        token_expires_at: verification.tokenExpiresAt,
        last_verified_at: new Date().toISOString(),
        is_default: isDefault,
      },
      { onConflict: "user_id,page_id" }
    )
    .select(
      "id, page_id, page_name, category, followers_count, token_last4, token_status, token_expires_at, last_verified_at, is_default, created_at, updated_at"
    )
    .single();

  if (error || !page) {
    throw new Error(error?.message || "Failed to save Facebook Page");
  }

  return page;
}

/**
 * Decrypts a stored ciphertext back into the plaintext token with AAD support.
 */
export function decryptPageToken(ciphertext: string, userId?: string): string {
  return decryptFromBytea(ciphertext, userId ? `facebook_pages:${userId}` : undefined);
}

export interface PublishFacebookPostInput {
  pageId: string;
  token: string;
  message: string;
  imageBuffer: Buffer;
  imageMimeType?: string;
  scheduledPublishTime?: Date | null;
}

export interface PublishFacebookPostOutput {
  fbPostId: string;
  fbPhotoId: string;
  scheduledPublishTime?: string | null;
  publishedAt?: string | null;
}

export interface PublishFacebookTextPostInput {
  pageId: string;
  token: string;
  message: string;
}

/**
 * Publishes a text-only post to a Facebook Page feed.
 */
export async function publishTextPostToFacebook(
  input: PublishFacebookTextPostInput
): Promise<{ fbPostId: string; publishedAt: string }> {
  const feedParams = new URLSearchParams();
  feedParams.append("message", input.message.trim());
  feedParams.append("access_token", input.token.trim());

  const feedRes = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(input.pageId.trim())}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: feedParams.toString(),
  });
  const feedData = await feedRes.json();

  if (!feedRes.ok || !feedData.id) {
    const mapped = mapGraphError(feedData.error || {});
    throw new Error(mapped.message);
  }

  return {
    fbPostId: feedData.id,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Publishes or natively schedules a post with image to Facebook Page via Graph API.
 */
export async function publishPostToFacebook(
  input: PublishFacebookPostInput
): Promise<PublishFacebookPostOutput> {
  const cleanId = input.pageId.trim();
  const cleanToken = input.token.trim();
  const scheduledTime = input.scheduledPublishTime;

  const now = Date.now();
  const isNativeScheduling =
    scheduledTime !== null &&
    scheduledTime !== undefined &&
    scheduledTime.getTime() - now >= 10 * 60 * 1000 && // >= 10 minutes away
    scheduledTime.getTime() - now <= 30 * 24 * 60 * 60 * 1000; // <= 30 days away

  const blob = new Blob([new Uint8Array(input.imageBuffer)], {
    type: input.imageMimeType || "image/png",
  });

  if (isNativeScheduling && scheduledTime) {
    // 1. Native Scheduling Path: upload unpublished temporary photo
    const photoForm = new FormData();
    photoForm.append("source", blob, "image.png");
    photoForm.append("published", "false");
    photoForm.append("temporary", "true");
    photoForm.append("access_token", cleanToken);

    const photoRes = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(cleanId)}/photos`, {
      method: "POST",
      body: photoForm,
    });
    const photoData = await photoRes.json();

    if (!photoRes.ok || !photoData.id) {
      const mapped = mapGraphError(photoData.error || {});
      throw new Error(mapped.message);
    }

    const photoId = photoData.id;
    const scheduledEpochSeconds = Math.floor(scheduledTime.getTime() / 1000);

    // 2. Schedule feed post with attached photo
    const feedParams = new URLSearchParams();
    feedParams.append("message", input.message);
    feedParams.append("published", "false");
    feedParams.append("scheduled_publish_time", String(scheduledEpochSeconds));
    feedParams.append("attached_media", JSON.stringify([{ media_fbid: photoId }]));
    feedParams.append("access_token", cleanToken);

    const feedRes = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(cleanId)}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: feedParams.toString(),
    });
    const feedData = await feedRes.json();

    if (!feedRes.ok || !feedData.id) {
      const mapped = mapGraphError(feedData.error || {});
      throw new Error(mapped.message);
    }

    return {
      fbPostId: feedData.id,
      fbPhotoId: photoId,
      scheduledPublishTime: scheduledTime.toISOString(),
      publishedAt: null,
    };
  } else {
    // Immediate / Self-scheduled publish path
    const photoForm = new FormData();
    photoForm.append("source", blob, "image.png");
    photoForm.append("caption", input.message);
    photoForm.append("published", "true");
    photoForm.append("access_token", cleanToken);

    const photoRes = await fetch(`${GRAPH_BASE_URL}/${encodeURIComponent(cleanId)}/photos`, {
      method: "POST",
      body: photoForm,
    });
    const photoData = await photoRes.json();

    if (!photoRes.ok || !photoData.id) {
      const mapped = mapGraphError(photoData.error || {});
      throw new Error(mapped.message);
    }

    return {
      fbPostId: photoData.post_id || photoData.id,
      fbPhotoId: photoData.id,
      scheduledPublishTime: null,
      publishedAt: new Date().toISOString(),
    };
  }
}
