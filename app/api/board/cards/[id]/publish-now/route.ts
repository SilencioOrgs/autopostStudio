import { type NextRequest } from "next/server";
import { getAuthUser } from "@/app/_lib/supabase/server";
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
    const admin = getSupabaseAdminClient();

    // 1. Fetch card details with prompt, generation, and channel
    const { data: card, error: cardErr } = await admin
      .from("board_cards")
      .select("*, prompts(*), generations(*), facebook_pages(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (cardErr || !card) {
      return apiError("NOT_FOUND", "Board card not found.", 404);
    }

    // 2. Resolve Facebook Page
    let page = card.facebook_pages;
    if (!page) {
      const { data: defaultPage } = await admin
        .from("facebook_pages")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      page = defaultPage;
    }

    if (!page) {
      const { data: anyPage } = await admin
        .from("facebook_pages")
        .select("*")
        .eq("user_id", user.id)
        .eq("token_status", "valid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      page = anyPage;
    }

    if (!page) {
      return apiError(
        "FB_PAGE_NOT_FOUND",
        "No connected Facebook Page found. Please connect your page in Settings.",
        400
      );
    }

    if (page.token_status !== "valid") {
      return apiError(
        "FB_TOKEN_INVALID",
        "The connected Facebook Page token is expired or invalid. Please reconnect.",
        400
      );
    }

    // 3. Resolve Generation & Storage Path
    let generation = card.generations as { id: string; storage_path: string | null } | null;
    if (!generation?.storage_path && card.prompt_id) {
      const { data: gen } = await admin
        .from("generations")
        .select("*")
        .eq("prompt_id", card.prompt_id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      generation = gen;
    }

    if (!generation?.storage_path) {
      return apiError("IMAGE_NOT_FOUND", "No rendered graphic found for this post.", 404);
    }

    // 4. Download image buffer from Supabase Storage
    const { data: fileData, error: downloadErr } = await admin.storage
      .from("generated-images")
      .download(generation.storage_path);

    if (downloadErr || !fileData) {
      return apiError("INTERNAL_ERROR", "Failed to retrieve graphic from storage.", 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 5. Decrypt Page Access Token
    const token = decryptPageToken(page.token_ciphertext, user.id);

    // 6. Build post message with caption & hashtags
    let message =
      card.prompts?.caption || card.prompts?.image_prompt || "Published via AutoPost Studio";
    if (
      card.prompts?.hashtags &&
      Array.isArray(card.prompts.hashtags) &&
      card.prompts.hashtags.length > 0
    ) {
      const tagString = card.prompts.hashtags
        .map((t: string) => (t.startsWith("#") ? t : `#${t}`))
        .join(" ");
      message = `${message}\n\n${tagString}`;
    }

    // 7. Publish directly to Facebook Page Feed via Graph API
    const fbResult = await publishPostToFacebook({
      pageId: page.page_id,
      token,
      message,
      imageBuffer,
      imageMimeType: fileData.type || "image/png",
      scheduledPublishTime: null, // immediate post
    });

    const publishedTimestamp = fbResult.publishedAt || new Date().toISOString();

    // 8. Record in posts ledger
    await admin.from("posts").insert({
      user_id: user.id,
      card_id: card.id,
      facebook_page_id: page.id,
      prompt_id: card.prompt_id,
      generation_id: generation.id,
      caption_final: message,
      fb_post_id: fbResult.fbPostId,
      fb_photo_id: fbResult.fbPhotoId,
      published_at: publishedTimestamp,
      status: "published",
      fb_mode: "immediate",
      publish_attempts: 1,
    });

    // 9. Update board card status
    await admin
      .from("board_cards")
      .update({
        status: "published",
        facebook_page_id: page.id,
      })
      .eq("id", card.id);

    // 10. Update prompt status
    if (card.prompt_id) {
      await admin
        .from("prompts")
        .update({ status: "posted" })
        .eq("id", card.prompt_id);
    }

    return apiSuccess({
      published: true,
      fbPostId: fbResult.fbPostId,
      fbPhotoId: fbResult.fbPhotoId,
      pageName: page.page_name,
      postUrl: `https://facebook.com/${fbResult.fbPostId}`,
      message: `Successfully posted to ${page.page_name} feed!`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to publish post to Facebook";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
