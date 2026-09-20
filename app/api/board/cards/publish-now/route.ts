import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { decryptPageToken, publishPostToFacebook } from "@/app/_lib/services/facebook";

const BatchPublishSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1, "Select at least one card to publish"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = BatchPublishSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { cardIds } = parsed.data;
    const admin = getSupabaseAdminClient();

    // Resolve user's active Facebook Page
    const { data: defaultPage } = await admin
      .from("facebook_pages")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    let page = defaultPage;
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

    const token = decryptPageToken(page.token_ciphertext, user.id);
    const results: { cardId: string; success: boolean; fbPostId?: string; error?: string }[] = [];

    for (const cardId of cardIds) {
      try {
        const { data: card } = await admin
          .from("board_cards")
          .select("*, prompts(*), generations(*)")
          .eq("id", cardId)
          .eq("user_id", user.id)
          .single();

        if (!card) {
          results.push({ cardId, success: false, error: "Card not found" });
          continue;
        }

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
          results.push({ cardId, success: false, error: "No image found" });
          continue;
        }

        const { data: fileData, error: downloadErr } = await admin.storage
          .from("generated-images")
          .download(generation.storage_path);

        if (downloadErr || !fileData) {
          results.push({ cardId, success: false, error: "Failed to download image" });
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

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

        const fbResult = await publishPostToFacebook({
          pageId: page.page_id,
          token,
          message,
          imageBuffer,
          imageMimeType: fileData.type || "image/png",
          scheduledPublishTime: null,
        });

        const publishedTimestamp = fbResult.publishedAt || new Date().toISOString();

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

        await admin
          .from("board_cards")
          .update({
            status: "published",
            facebook_page_id: page.id,
          })
          .eq("id", card.id);

        if (card.prompt_id) {
          await admin
            .from("prompts")
            .update({ status: "posted" })
            .eq("id", card.prompt_id);
        }

        results.push({ cardId, success: true, fbPostId: fbResult.fbPostId });
      } catch (postErr: unknown) {
        const errorMsg = postErr instanceof Error ? postErr.message : "Publish failed";
        results.push({ cardId, success: false, error: errorMsg });
      }
    }

    const publishedCount = results.filter((r) => r.success).length;
    const failedCount = results.length - publishedCount;

    return apiSuccess({
      publishedCount,
      failedCount,
      pageName: page.page_name,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Batch publish failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
