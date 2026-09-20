import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { decryptPageToken, publishTextPostToFacebook } from "@/app/_lib/services/facebook";

const TextPostSchema = z.object({
  message: z.string().trim().min(1, "Post text is required").max(63206, "Post text is too long"),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const parsed = TextPostSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { id } = await params;
    const admin = getSupabaseAdminClient();
    const { data: page, error } = await admin
      .from("facebook_pages")
      .select("page_id, token_ciphertext, token_status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !page) {
      return apiError("NOT_FOUND", "Facebook Page not found.", 404);
    }
    if (page.token_status !== "valid") {
      return apiError("FB_TOKEN_INVALID", "The connected Facebook Page does not have a valid access token.", 400);
    }

    const result = await publishTextPostToFacebook({
      pageId: page.page_id,
      token: decryptPageToken(page.token_ciphertext, user.id),
      message: parsed.data.message,
    });

    return apiSuccess({
      published: true,
      fbPostId: result.fbPostId,
      publishedAt: result.publishedAt,
      message: "Text post successfully published to Facebook.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Text post failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}