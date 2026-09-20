import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const UpdateSettingsSchema = z
  .object({
    dailyPostCap: z.number().int().min(1).max(20).optional(),
    boardDays: z.number().int().min(7).max(30).optional(),
    defaultStylePreset: z.string().max(500).optional(),
    generationPaused: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_post_cap, board_days, default_style_preset, generation_paused")
      .eq("id", user.id)
      .single();

    const { data: providerKey } = await supabase
      .from("provider_keys")
      .select("provider, key_last4, status, last_verified_at")
      .eq("user_id", user.id)
      .eq("provider", "google_ai_studio")
      .maybeSingle();

    return apiSuccess({
      dailyPostCap: profile?.daily_post_cap ?? 3,
      boardDays: profile?.board_days ?? 14,
      defaultStylePreset: profile?.default_style_preset ?? "Modern architectural photography, photorealistic, 8k, natural lighting",
      generationPaused: profile?.generation_paused ?? false,
      providerKey: providerKey || null,
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
    } = {};

    if (data.dailyPostCap !== undefined) updatePayload.daily_post_cap = data.dailyPostCap;
    if (data.boardDays !== undefined) updatePayload.board_days = data.boardDays;
    if (data.defaultStylePreset !== undefined) updatePayload.default_style_preset = data.defaultStylePreset.trim();
    if (data.generationPaused !== undefined) updatePayload.generation_paused = data.generationPaused;

    const admin = getSupabaseAdminClient();
    const { data: updatedProfile, error } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select("daily_post_cap, board_days, default_style_preset, generation_paused")
      .single();

    if (error || !updatedProfile) {
      return apiError("INTERNAL_ERROR", error?.message || "Failed to update settings", 500);
    }

    return apiSuccess({
      dailyPostCap: updatedProfile.daily_post_cap,
      boardDays: updatedProfile.board_days,
      defaultStylePreset: updatedProfile.default_style_preset,
      generationPaused: updatedProfile.generation_paused,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
