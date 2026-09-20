import "server-only";
import { GoogleGenAI } from "@google/genai";

export interface GenerateImageInput {
  prompt: string;
  systemInstruction?: string;
  aspect: "4:5" | "1:1" | "16:9";
  imageSize?: "1K" | "2K";
  apiKey: string;
  model: string;
}

export interface GenerateImageOutput {
  bytes: Buffer;
  mimeType: string;
  latencyMs: number;
}

/**
 * Maps errors from Google AI Studio / Gemini into clean, stable error codes.
 */
export function mapGeminiError(err: unknown): { code: string; message: string; status: number } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // 429 Quota Exhausted
  if (lower.includes("429") || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return {
      code: "AI_QUOTA_EXCEEDED",
      message:
        "Your Google AI Studio quota is exhausted. Generation resumes when your quota resets, or raise your limit in Google AI Studio.",
      status: 429,
    };
  }

  // 401 / 403 Invalid Key or Permissions
  if (
    lower.includes("401") ||
    lower.includes("api_key_invalid") ||
    lower.includes("invalid api key") ||
    lower.includes("unauthenticated")
  ) {
    return {
      code: "AI_KEY_INVALID",
      message: "The Google AI Studio API key was rejected as invalid or unauthorized.",
      status: 401,
    };
  }

  // Billing Required
  if (lower.includes("billing") || lower.includes("billing_not_enabled")) {
    return {
      code: "AI_BILLING_REQUIRED",
      message: "Your Google Cloud project requires an active billing account for this AI model.",
      status: 403,
    };
  }

  // API not enabled
  if (lower.includes("api not enabled") || lower.includes("generativelanguage.googleapis.com")) {
    return {
      code: "AI_API_NOT_ENABLED",
      message: "The Generative Language API is not enabled on your Google Cloud project.",
      status: 403,
    };
  }

  // Region unsupported
  if (lower.includes("location") || lower.includes("region") || lower.includes("not supported")) {
    return {
      code: "AI_REGION_UNSUPPORTED",
      message: "Google AI Studio image generation is not available in your region.",
      status: 403,
    };
  }

  return {
    code: "AI_GENERATION_FAILED",
    message: msg || "Google AI Studio encountered an error during image generation.",
    status: 500,
  };
}

/**
 * Verifies a user's Google AI Studio key with the cheapest possible text generation call.
 * Does not generate any image or spend image quota.
 */
export async function verifyGoogleAiKey(
  apiKey: string
): Promise<{ valid: boolean; errorCode?: string; errorMessage?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return {
      valid: false,
      errorCode: "AI_KEY_MISSING",
      errorMessage: "API key cannot be empty.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    // Cheap ping call using lightweight gemini model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello",
      config: {
        maxOutputTokens: 5,
        temperature: 0,
      },
    });

    if (response && response.text !== undefined) {
      return { valid: true };
    }

    return {
      valid: false,
      errorCode: "AI_KEY_INVALID",
      errorMessage: "Google AI Studio did not return a valid verification response.",
    };
  } catch (err: unknown) {
    const mapped = mapGeminiError(err);
    return {
      valid: false,
      errorCode: mapped.code,
      errorMessage: mapped.message,
    };
  }
}

/**
 * Generates an image using Google Gemini / Imagen models.
 * Decrypted apiKey is passed in strictly in-memory per invocation.
 */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const startTime = Date.now();
  const ai = new GoogleGenAI({ apiKey: input.apiKey });

  // Map aspect ratio string to valid aspect ratio enum
  const aspect = input.aspect || "4:5";
  const modelName = input.model || "imagen-3.0-generate-002";

  try {
    // Attempt 1: Standard generateImages (Imagen models)
    if (modelName.toLowerCase().includes("imagen")) {
      const response = await ai.models.generateImages({
        model: modelName,
        prompt: input.systemInstruction
          ? `${input.systemInstruction}\n\nSubject: ${input.prompt}`
          : input.prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspect,
          outputMimeType: "image/png",
        },
      });

      const firstImage = response.generatedImages?.[0]?.image;
      if (firstImage?.imageBytes) {
        const bytes = Buffer.from(firstImage.imageBytes, "base64");
        return {
          bytes,
          mimeType: "image/png",
          latencyMs: Date.now() - startTime,
        };
      }
    }

    type CreateFn = (...args: unknown[]) => Promise<{
      output_image?: { image_bytes?: string; mime_type?: string };
      outputs?: Array<{ type: string; data?: string; mime_type?: string }>;
      steps?: Array<{ content?: Array<{ inline_data?: { data?: string; mime_type?: string } }> }>;
    }>;
    const aiAny = ai as unknown as { interactions?: { create: CreateFn } };
    if (typeof aiAny.interactions?.create === "function") {
      const interactions = aiAny.interactions;
      const interaction = await interactions.create({
        model: modelName,
        input: {
          prompt: input.prompt,
          system_instruction: input.systemInstruction,
        },
        image_config: {
          aspect_ratio: aspect,
          image_size: input.imageSize || "1K",
        },
        response_modalities: ["IMAGE"],
      });

      // Defensive read path: output_image, outputs[], or steps[].content[] per §6.1
      if (interaction?.output_image?.image_bytes) {
        return {
          bytes: Buffer.from(interaction.output_image.image_bytes, "base64"),
          mimeType: interaction.output_image.mime_type || "image/png",
          latencyMs: Date.now() - startTime,
        };
      }

      if (Array.isArray(interaction?.outputs)) {
        for (const out of interaction.outputs) {
          if (out.type === "image" && out.data) {
            return {
              bytes: Buffer.from(out.data, "base64"),
              mimeType: out.mime_type || "image/png",
              latencyMs: Date.now() - startTime,
            };
          }
        }
      }

      if (Array.isArray(interaction?.steps)) {
        for (const step of interaction.steps) {
          if (Array.isArray(step.content)) {
            for (const part of step.content) {
              if (part.inline_data?.data) {
                return {
                  bytes: Buffer.from(part.inline_data.data, "base64"),
                  mimeType: part.inline_data.mime_type || "image/png",
                  latencyMs: Date.now() - startTime,
                };
              }
            }
          }
        }
      }
    }

    // Attempt 3: Fallback to generateImages with default imagen model if interactions failed
    const fallbackResponse = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: input.systemInstruction
        ? `${input.systemInstruction}\n\nSubject: ${input.prompt}`
        : input.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspect,
        outputMimeType: "image/png",
      },
    });

    const fallbackImg = fallbackResponse.generatedImages?.[0]?.image;
    if (fallbackImg?.imageBytes) {
      return {
        bytes: Buffer.from(fallbackImg.imageBytes, "base64"),
        mimeType: "image/png",
        latencyMs: Date.now() - startTime,
      };
    }

    throw new Error(`Google AI Studio did not return image data for model '${modelName}'`);
  } catch (err: unknown) {
    const mapped = mapGeminiError(err);
    const error = new Error(mapped.message);
    (error as unknown as { code: string; status: number }).code = mapped.code;
    (error as unknown as { code: string; status: number }).status = mapped.status;
    throw error;
  }
}

/**
 * Generates prompt variations from a given topic using Gemini text model.
 */
export async function generatePromptsFromTopic(input: {
  topic: string;
  style: string;
  count: number;
  apiKey: string;
}): Promise<Array<{ imagePrompt: string; caption: string; hashtags: string[] }>> {
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const count = Math.min(10, Math.max(1, input.count || 3));

  const prompt = `You are an expert social media content engineer. Generate ${count} high-performing social media post concepts for Facebook.
Topic: "${input.topic}"
Style/Niche: "${input.style || "Modern Minimalist"}"

Return ONLY a valid JSON array of objects with this schema:
[
  {
    "imagePrompt": "Photorealistic image generation prompt (~80 words), highly detailed, natural lighting, high aesthetic quality",
    "caption": "Engaging Facebook post copy with compelling call-to-action and relevant emojis",
    "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "[]";
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        imagePrompt: String(item.imagePrompt || "").trim(),
        caption: String(item.caption || "").trim(),
        hashtags: Array.isArray(item.hashtags)
          ? item.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`))
          : [],
      }));
    }
  } catch {
    // parse fallback
  }

  return [];
}
