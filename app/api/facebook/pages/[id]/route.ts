import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const UpdatePageSchema = z
  .object({
    pageName: z.string().min(1).max(100).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { id } = await params;
    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = UpdatePageSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400);
    }

    const { pageName, isDefault } = parsed.data;
    // Credential rows are server-owned after hardening_2. The authenticated
    // caller is established above; the admin query is explicitly scoped to it.
    const admin = getSupabaseAdminClient();

    // If setting as default, clear default flag from other user pages
    if (isDefault) {
      await admin
        .from("facebook_pages")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const updatePayload: { page_name?: string; is_default?: boolean } = {};
    if (pageName !== undefined) updatePayload.page_name = pageName.trim();
    if (isDefault !== undefined) updatePayload.is_default = isDefault;

    const { data: page, error } = await admin
      .from("facebook_pages")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        "id, page_id, page_name, category, followers_count, token_last4, token_status, token_expires_at, last_verified_at, is_default, created_at, updated_at"
      )
      .single();

    if (error || !page) {
      return apiError("NOT_FOUND", "Facebook Page not found.", 404);
    }

    return apiSuccess(page);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update page";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function DELETE(
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

    // 1. Check affected scheduled cards
    const { count: affectedCards } = await admin
      .from("board_cards")
      .select("id", { count: "exact", head: true })
      .eq("facebook_page_id", id)
      .eq("user_id", user.id)
      .in("status", ["planned", "scheduled"]);

    // 2. Delete the Facebook Page record
    const { error } = await admin
      .from("facebook_pages")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess({
      deleted: true,
      affectedScheduledPosts: affectedCards || 0,
      message: `Facebook Page disconnected.${
        affectedCards ? ` ${affectedCards} scheduled posts were unlinked.` : ""
      }`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to disconnect page";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
