import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { decryptPageToken, publishPostToFacebook } from "@/app/_lib/services/facebook";

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

    let page = null;
    const admin = getSupabaseAdminClient();
    if (post.facebook_page_id) {
      const { data: pageData } = await admin
        .from("facebook_pages")
        .select("*")
        .eq("id", post.facebook_page_id)
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
    if (post.generation_id) {
      const { data: genData } = await supabase
        .from("generations")
        .select("*")
        .eq("id", post.generation_id)
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
        message: post.caption_final || "Published via AutoPost Studio",
        imageBuffer,
        imageMimeType: fileData.type || "image/png",
        scheduledPublishTime: null,
      });

      // 4. Update post row to published
      await supabase
        .from("posts")
        .update({
          fb_post_id: result.fbPostId,
          fb_photo_id: result.fbPhotoId,
          published_at: new Date().toISOString(),
          status: "published",
          error_code: null,
          error_message: null,
        })
        .eq("id", id);

      if (post.prompt_id) {
        await supabase
          .from("prompts")
          .update({ status: "posted" })
          .eq("id", post.prompt_id);
      }

      return apiSuccess({
        published: true,
        fbPostId: result.fbPostId,
        fbPhotoId: result.fbPhotoId,
        message: "Post successfully published to Facebook!",
      });
    } catch (fbErr: unknown) {
      const msg = fbErr instanceof Error ? fbErr.message : "Publishing to Facebook failed";
      await supabase
        .from("posts")
        .update({
          status: "failed",
          error_message: msg,
        })
        .eq("id", id);

      return apiError("INTERNAL_ERROR", msg, 500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Retry failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
