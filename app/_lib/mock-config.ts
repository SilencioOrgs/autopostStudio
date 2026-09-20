/** Shared, non-secret image-generation configuration. */

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const MODEL_OPTIONS: readonly ModelOption[] = [
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "FLUX.1 Schnell",
    description: "Fast, high-quality 12B parameter model (recommended)",
  },
  {
    id: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    name: "Stable Diffusion XL",
    description: "Classic SDXL for detailed, high-resolution images",
  },
  {
    id: "@cf/bytedance/stable-diffusion-xl-lightning",
    name: "SDXL Lightning",
    description: "Optimised SDXL for fast generation",
  },
] as const;

export const DEFAULT_IMAGE_MODEL = MODEL_OPTIONS[0].id;

export const MOCK_CONFIG = {
  minDurationMs: 8000,
  maxDurationMs: 20000,
  defaultMaxConcurrent: 3,
  mockFailureRate: 0.1,
  verifyLatencyMs: 1200,
  testImageDurationMs: 2000,
} as const;
