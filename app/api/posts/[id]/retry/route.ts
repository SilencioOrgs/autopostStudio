import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { decryptPageToken, publishPostToFacebook } from "@/app/_lib/services/facebook";
import { requireSameOrigin } from "@/app/_lib/api-security";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch post with page and generation details
    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (postErr || !post) {
      return apiError("NOT_FOUND", "Post record not found.", 404);
    }

    const admin = getSupabaseAdminClient();
    if (post.status !== "failed") {
      return apiError("VALIDATION_ERROR", "Only failed posts can be retried.", 409);
    }
    if (post.publish_attempts >= 5) {
      return apiError("VALIDATION_ERROR", "This post reached the retry limit. Reconnect the Page and create a new schedule.", 409);
    }
    const { data: claimed } = await admin
      .from("posts")
      .update({ status: "publishing", last_attempt_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id).eq("status", "failed")
      .select("*").maybeSingle();
    if (!claimed) return apiError("VALIDATION_ERROR", "This post is already being processed.", 409);

    let page = null;
    if (claimed.facebook_page_id) {
      const { data: pageData } = await admin
        .from("facebook_pages")
        .select("*")
        .eq("id", claimed.facebook_page_id)
        .eq("user_id", user.id)
        .maybeSingle();
      page = pageData;
    }

    if (!page || page.token_status !== "valid") {
      return apiError(
        "FB_TOKEN_INVALID",
        "The connected Facebook Page does not have a valid access token. Please reconnect.",
        400
      );
    }

    let generation = null;
    if (claimed.generation_id) {
      const { data: genData } = await supabase
        .from("generations")
        .select("*")
        .eq("id", claimed.generation_id)
        .maybeSingle();
      generation = genData;
    }

    if (!generation?.storage_path) {
      return apiError("NOT_FOUND", "Generated image not found in storage.", 404);
    }

    // 2. Download image buffer from Supabase Storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("generated-images")
      .download(generation.storage_path);

    if (downloadErr || !fileData) {
      return apiError("INTERNAL_ERROR", "Failed to retrieve image buffer from storage.", 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const token = decryptPageToken(page.token_ciphertext, user.id);

    // 3. Publish to Facebook Graph API immediately
    try {
      const result = await publishPostToFacebook({
        pageId: page.page_id,
        token,
        message: claimed.caption_final || "Published via AutoPost Studio",
        imageBuffer,
        imageMimeType: fileData.type || "image/png",
        scheduledPublishTime: null,
      });

      // 4. Update post row to published
      await admin
        .from("posts")
        .update({
          fb_post_id: result.fbPostId,
          fb_photo_id: result.fbPhotoId,
          published_at: new Date().toISOString(),
          status: "published",
          error_code: null,
          error_message: null,
          publish_attempts: claimed.publish_attempts + 1,
          fb_mode: "immediate",
        })
        .eq("id", id).eq("status", "publishing");

      if (claimed.prompt_id) {
        await admin
          .from("prompts")
          .update({ status: "posted" })
          .eq("id", claimed.prompt_id);
      }
      if (claimed.card_id) await admin.from("board_cards").update({ status: "published" }).eq("id", claimed.card_id);

      return apiSuccess({
        published: true,
        fbPostId: result.fbPostId,
        fbPhotoId: result.fbPhotoId,
        message: "Post successfully published to Facebook!",
      });
    } catch (fbErr: unknown) {
      console.error("Post retry failed", fbErr);
      await admin
        .from("posts")
        .update({
          status: "failed",
          error_code: "PUBLISH_FAILED",
          error_message: "Publication failed. Check the Page connection and retry.",
          publish_attempts: claimed.publish_attempts + 1,
        })
        .eq("id", id).eq("status", "publishing");

      return apiError("INTERNAL_ERROR", undefined, 503);
    }
  } catch (err: unknown) {
    console.error("Post retry failed", err);
    return apiError("INTERNAL_ERROR", undefined, 500);
  }
}
