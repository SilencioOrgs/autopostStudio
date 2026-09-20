import { type NextRequest } from "next/server";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { verifyFacebookCredentials, decryptPageToken } from "@/app/_lib/services/facebook";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { id } = await params;
    const admin = getSupabaseAdminClient();

    // 1. Fetch page using admin client (ciphertext column access revoked from authenticated role)
    const { data: page, error } = await admin
      .from("facebook_pages")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !page) {
      return apiError("NOT_FOUND", "Facebook Page not found.", 404);
    }

    // 2. Decrypt token with AAD and call Graph API
    let token: string;
    try {
      token = decryptPageToken(page.token_ciphertext, user.id);
    } catch {
      await admin
        .from("facebook_pages")
        .update({ token_status: "invalid" })
        .eq("id", id);
      return apiError("FB_TOKEN_INVALID", "Stored token could not be decrypted. Please reconnect.", 400);
    }

    const verification = await verifyFacebookCredentials(page.page_id, token);
    const newStatus = verification.valid ? "valid" : "expired";

    // 3. Update status in database
    await admin
      .from("facebook_pages")
      .update({
        token_status: newStatus,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", id);

    return apiSuccess({
      pageId: page.page_id,
      pageName: page.page_name,
      valid: verification.valid,
      status: newStatus,
      followersCount: verification.followersCount,
      message: verification.valid
        ? "Facebook Page token successfully verified with Meta."
        : verification.errorMessage || "Token expired or revoked.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify Facebook Page";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
