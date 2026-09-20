import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { computeContentHash, parseHashtags } from "@/app/_lib/services/import";

const UpdatePromptSchema = z
  .object({
    imagePrompt: z.string().min(3).optional(),
    caption: z.string().optional(),
    hashtags: z.union([z.array(z.string()), z.string()]).optional(),
    style: z.string().optional(),
    aspect: z.enum(["4:5", "1:1", "16:9"]).optional(),
    status: z
      .enum(["draft", "queued", "generating", "ready", "approved", "scheduled", "posted", "failed"])
      .optional(),
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

    const parsed = UpdatePromptSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400);
    }

    const supabase = await createClient();

    // Fetch existing prompt
    const { data: existing, error: fetchErr } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !existing) {
      return apiError("NOT_FOUND", "Prompt not found.", 404);
    }

    const updates = parsed.data;
    const finalPrompt = updates.imagePrompt !== undefined ? updates.imagePrompt.trim() : existing.image_prompt;
    const finalCaption = updates.caption !== undefined ? updates.caption.trim() : existing.caption;

    let finalHashtags = existing.hashtags;
    if (updates.hashtags !== undefined) {
      if (Array.isArray(updates.hashtags)) {
        finalHashtags = updates.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`));
      } else {
        finalHashtags = parseHashtags(updates.hashtags);
      }
    }

    const newHash = computeContentHash(finalPrompt, finalCaption || "");

    const updatePayload: {
      image_prompt?: string;
      caption?: string | null;
      hashtags?: string[];
      style?: string | null;
      aspect?: "4:5" | "1:1" | "16:9";
      status?: "draft" | "queued" | "generating" | "ready" | "approved" | "scheduled" | "posted" | "failed";
      content_hash: string;
    } = {
      content_hash: newHash,
    };

    if (updates.imagePrompt !== undefined) updatePayload.image_prompt = finalPrompt;
    if (updates.caption !== undefined) updatePayload.caption = finalCaption || null;
    if (updates.hashtags !== undefined) updatePayload.hashtags = finalHashtags;
    if (updates.style !== undefined) updatePayload.style = updates.style?.trim() || null;
    if (updates.aspect !== undefined) updatePayload.aspect = updates.aspect;
    if (updates.status !== undefined) updatePayload.status = updates.status;

    const { data: updatedPrompt, error: updateErr } = await supabase
      .from("prompts")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr || !updatedPrompt) {
      return apiError("INTERNAL_ERROR", updateErr?.message || "Failed to update prompt", 500);
    }

    return apiSuccess(updatedPrompt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update prompt";
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
    const supabase = await createClient();

    const { error } = await supabase.from("prompts").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess({ deleted: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete prompt";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
