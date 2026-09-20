import { type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { generateCloudflareImage } from "@/app/_lib/ai/cloudflare";
import { MODEL_OPTIONS, DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";
import { computeContentHash } from "@/app/_lib/services/import";

const validModelIds = MODEL_OPTIONS.map((m) => m.id);

const GenerateImageSchema = z
  .object({
    prompt: z.string().min(3, "Prompt must be at least 3 characters").max(2048),
    model: z.string().refine((v) => validModelIds.includes(v), {
      message: "Invalid image model",
    }).optional(),
    aspect: z.enum(["4:5", "1:1", "16:9"]).optional(),
    style: z.string().max(500).optional(),
    title: z.string().max(200).optional(),
    caption: z.string().max(2000).optional(),
    hashtags: z.array(z.string()).optional(),
    saveToLibrary: z.boolean().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to generate images.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = GenerateImageSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const data = parsed.data;
    const modelToUse = data.model || DEFAULT_IMAGE_MODEL;
    const aspectToUse = data.aspect || "4:5";

    // Call Cloudflare Workers AI REST API directly
    const result = await generateCloudflareImage({
      prompt: data.prompt,
      model: modelToUse,
      aspect: aspectToUse,
      systemInstruction: data.style,
    });

    const base64Data = result.bytes.toString("base64");
    const dataUrl = `data:${result.mimeType};base64,${base64Data}`;

    let savedPromptId: string | null = null;
    let savedStoragePath: string | null = null;

    // Optional: persist directly to library & Supabase storage
    if (data.saveToLibrary) {
      const admin = getSupabaseAdminClient();
      const promptId = crypto.randomUUID();
      const generationId = crypto.randomUUID();
      const storagePath = `${user.id}/assistant/${promptId}-${generationId}.png`;

      const { error: storageError } = await admin.storage
        .from("generated-images")
        .upload(storagePath, result.bytes, {
          contentType: result.mimeType || "image/png",
          upsert: true,
        });

      if (!storageError) {
        savedStoragePath = storagePath;
        savedPromptId = promptId;

        const contentHash = computeContentHash(data.prompt, data.caption || "");

        await admin.from("prompts").insert({
          id: promptId,
          user_id: user.id,
          image_prompt: data.prompt,
          caption: data.caption || null,
          hashtags: data.hashtags || [],
          aspect: aspectToUse,
          style: data.style || null,
          status: "ready",
          content_hash: contentHash,
        });

        await admin.from("generations").insert({
          id: generationId,
          user_id: user.id,
          prompt_id: promptId,
          model: result.model,
          system_instruction: data.style || "",
          aspect: aspectToUse,
          image_size: "1K",
          storage_path: storagePath,
          bytes: result.bytes.length,
          latency_ms: result.latencyMs,
          status: "succeeded",
          attempt: 1,
          created_at: new Date().toISOString(),
        });
      }
    }

    return apiSuccess({
      imageUrl: dataUrl,
      model: result.model,
      mimeType: result.mimeType,
      latencyMs: result.latencyMs,
      savedPromptId,
      storagePath: savedStoragePath,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    const status = (err as unknown as { status?: number })?.status || 500;
    return apiError("AI_GENERATION_FAILED", msg, status);
  }
}
