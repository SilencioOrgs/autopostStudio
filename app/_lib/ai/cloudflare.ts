import "server-only";
import { getCloudflareAccountId, getCloudflareApiToken } from "@/app/_lib/env";
import { DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";

export interface GenerateCloudflareImageInput {
  prompt: string;
  systemInstruction?: string;
  aspect: "4:5" | "1:1" | "16:9";
  model?: string;
}

export interface GenerateCloudflareImageOutput {
  bytes: Buffer;
  mimeType: string;
  model: string;
  latencyMs: number;
}

function providerError(message: string, status = 503) {
  const error = new Error(message);
  Object.assign(error, { code: "AI_PROVIDER_UNAVAILABLE", status });
  return error;
}

function quotaError(message: string) {
  const error = new Error(message);
  Object.assign(error, { code: "AI_QUOTA_EXCEEDED", status: 429 });
  return error;
}

/**
 * Calls the Cloudflare Workers AI REST API directly.
 * Endpoint: POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}
 */
export async function generateCloudflareImage(
  input: GenerateCloudflareImageInput
): Promise<GenerateCloudflareImageOutput> {
  let accountId: string;
  let apiToken: string;
  try {
    accountId = getCloudflareAccountId();
    apiToken = getCloudflareApiToken();
  } catch {
    throw providerError(
      "Cloudflare Workers AI credentials are not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment.",
      503
    );
  }
  const modelId = input.model || DEFAULT_IMAGE_MODEL;

  const fullPrompt = input.systemInstruction
    ? `${input.systemInstruction}\n\nSubject: ${input.prompt}`
    : input.prompt;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelId}`;

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
      }),
      cache: "no-store",
    });
  } catch {
    throw providerError(
      "Could not reach Cloudflare Workers AI. Check your network and account configuration."
    );
  }

  const latencyMs = Date.now() - startTime;

  // Handle rate limiting
  if (response.status === 429) {
    throw quotaError(
      "Cloudflare Workers AI rate limit reached. Generation will resume automatically."
    );
  }

  // The Workers AI REST API returns either:
  // 1. Raw binary PNG (Content-Type: image/png) for some models
  // 2. JSON with { result: { image: "<base64>" } } for others
  const contentType = response.headers.get("content-type") || "";

  if (contentType.startsWith("image/")) {
    // Raw binary response
    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    if (bytes.length === 0) {
      throw providerError("Cloudflare Workers AI returned an empty image.", 502);
    }

    return {
      bytes,
      mimeType: contentType.split(";")[0].trim(),
      model: modelId,
      latencyMs,
    };
  }

  // JSON response path
  const payload = await response.json().catch(() => null) as {
    result?: { image?: string };
    success?: boolean;
    errors?: Array<{ message?: string; code?: number }>;
  } | null;

  if (!response.ok || !payload?.success) {
    const errorMsg =
      payload?.errors?.[0]?.message ||
      "Cloudflare Workers AI image generation failed.";
    const errorStatus =
      response.status >= 400 && response.status < 600 ? response.status : 502;
    throw providerError(errorMsg, errorStatus);
  }

  const base64Image = payload?.result?.image;
  if (!base64Image) {
    throw providerError(
      "Cloudflare Workers AI returned no image data in the response.",
      502
    );
  }

  const cleaned = base64Image.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(cleaned, "base64");

  if (bytes.length === 0) {
    throw providerError("Cloudflare Workers AI returned an empty image.", 502);
  }

  return {
    bytes,
    mimeType: "image/png",
    model: modelId,
    latencyMs,
  };
}
