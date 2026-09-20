import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { MODEL_OPTIONS, DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";

const validModelIds = MODEL_OPTIONS.map((m) => m.id);

const UpdateSettingsSchema = z
  .object({
    dailyPostCap: z.number().int().min(1).max(20).optional(),
    boardDays: z.number().int().min(7).max(30).optional(),
    defaultStylePreset: z.string().max(500).optional(),
    generationPaused: z.boolean().optional(),
    imageModel: z.string().refine((v) => validModelIds.includes(v), {
      message: "Invalid image model",
    }).optional(),
  })
  .strict();

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const supabase = await createClient();

    let profileData: {
      daily_post_cap?: number;
      board_days?: number;
      default_style_preset?: string | null;
      generation_paused?: boolean;
      image_model?: string | null;
    } | null = null;

    // Try selecting with image_model column
    const { data: profileWithModel, error: selectErr } = await supabase
      .from("profiles")
      .select("daily_post_cap, board_days, default_style_preset, generation_paused, image_model")
      .eq("id", user.id)
      .maybeSingle();

    if (selectErr) {
      // Column might not exist in database yet; fallback to query without it
      const { data: baseProfile } = await supabase
        .from("profiles")
        .select("daily_post_cap, board_days, default_style_preset, generation_paused")
        .eq("id", user.id)
        .maybeSingle();
      profileData = baseProfile;
    } else {
      profileData = profileWithModel;
    }

    const metadataModel = user.user_metadata?.image_model as string | undefined;
    const resolvedModel = profileData?.image_model || metadataModel || DEFAULT_IMAGE_MODEL;

    return apiSuccess({
      dailyPostCap: profileData?.daily_post_cap ?? 3,
      boardDays: profileData?.board_days ?? 14,
      defaultStylePreset: profileData?.default_style_preset ?? "Modern architectural photography, photorealistic, 8k, natural lighting",
      generationPaused: profileData?.generation_paused ?? false,
      imageModel: resolvedModel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load settings";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = UpdateSettingsSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const data = parsed.data;
    const updatePayload: {
      daily_post_cap?: number;
      board_days?: number;
      default_style_preset?: string;
      generation_paused?: boolean;
      image_model?: string;
    } = {};

    if (data.dailyPostCap !== undefined) updatePayload.daily_post_cap = data.dailyPostCap;
    if (data.boardDays !== undefined) updatePayload.board_days = data.boardDays;
    if (data.defaultStylePreset !== undefined) updatePayload.default_style_preset = data.defaultStylePreset.trim();
    if (data.generationPaused !== undefined) updatePayload.generation_paused = data.generationPaused;
    if (data.imageModel !== undefined) updatePayload.image_model = data.imageModel;

    const admin = getSupabaseAdminClient();

    // Persist imageModel to user_metadata as resilient fallback
    if (data.imageModel) {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          image_model: data.imageModel,
        },
      });
    }

    let updatedProfile: {
      daily_post_cap?: number;
      board_days?: number;
      default_style_preset?: string | null;
      generation_paused?: boolean;
      image_model?: string | null;
    } | null = null;

    if (Object.keys(updatePayload).length > 0) {
      const { data: result, error: updateErr } = await admin
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id)
        .select("daily_post_cap, board_days, default_style_preset, generation_paused, image_model")
        .maybeSingle();

      if (updateErr) {
        // If update failed (e.g. image_model column missing), retry without image_model
        const { image_model: _omitted, ...safePayload } = updatePayload;
        if (Object.keys(safePayload).length > 0) {
          const { data: fallbackResult, error: fallbackErr } = await admin
            .from("profiles")
            .update(safePayload)
            .eq("id", user.id)
            .select("daily_post_cap, board_days, default_style_preset, generation_paused")
            .maybeSingle();

          if (fallbackErr) {
            return apiError("INTERNAL_ERROR", fallbackErr.message, 500);
          }
          updatedProfile = fallbackResult;
        } else {
          const { data: existingProfile } = await admin
            .from("profiles")
            .select("daily_post_cap, board_days, default_style_preset, generation_paused")
            .eq("id", user.id)
            .maybeSingle();
          updatedProfile = existingProfile;
        }
      } else {
        updatedProfile = result;
      }
    }

    const resolvedModel =
      updatedProfile?.image_model ||
      data.imageModel ||
      (user.user_metadata?.image_model as string | undefined) ||
      DEFAULT_IMAGE_MODEL;

    return apiSuccess({
      dailyPostCap: updatedProfile?.daily_post_cap ?? 3,
      boardDays: updatedProfile?.board_days ?? 14,
      defaultStylePreset: updatedProfile?.default_style_preset ?? "Modern architectural photography, photorealistic, 8k, natural lighting",
      generationPaused: updatedProfile?.generation_paused ?? false,
      imageModel: resolvedModel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
