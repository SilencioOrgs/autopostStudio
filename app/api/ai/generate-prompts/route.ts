import { type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";

const GeneratePromptsSchema = z
  .object({
    topic: z.string().min(2, "Topic must be at least 2 characters").max(500),
    aspect: z.enum(["4:5", "1:1", "16:9"]).optional(),
    model: z.string().optional(),
    brand: z.string().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to use the prompt assistant.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = GeneratePromptsSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { topic, aspect = "4:5", model = DEFAULT_IMAGE_MODEL, brand = "AutoPost" } = parsed.data;

    // Synthesize tailored image prompts for Cloudflare Workers AI
    const prompts = [
      {
        id: `gen-${crypto.randomUUID().slice(0, 8)}`,
        title: topic.length > 45 ? `${topic.slice(0, 42)}...` : topic,
        imagePrompt: `${topic}, dramatic volumetric lighting, cinematic architectural photography, ultra-detailed texture, 8k resolution, photorealistic, sharp focus, octane render style`,
        caption: `Exploring modern aesthetics: ${topic}. Designed for precision, durability, and timeless elegance.`,
        hashtags: [`#${brand.replace(/\s+/g, "")}`, "#ModernDesign", "#ArchitecturalPhotography", "#VisualCraft"],
        aspect,
        model,
        style: "Photorealistic Architectural",
        brand,
      },
      {
        id: `gen-${crypto.randomUUID().slice(0, 8)}`,
        title: `Minimalist Composition — ${topic.slice(0, 30)}`,
        imagePrompt: `Clean minimalist overhead framing illustrating ${topic}, soft diffused daylight, warm natural shadows, balanced neutral color palette, editorial magazine publication quality`,
        caption: `Subtle details that redefine the whole experience. A study in harmony and form.`,
        hashtags: [`#${brand.replace(/\s+/g, "")}`, "#Minimalism", "#DesignInspiration", "#ContentStudio"],
        aspect,
        model,
        style: "Minimalist Editorial",
        brand,
      },
    ];

    return apiSuccess({
      prompts,
      model,
      aspect,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate prompt ideas";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
