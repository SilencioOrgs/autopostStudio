/**
 * Configuration and tunables for frontend mock mode.
 */

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const MODEL_OPTIONS: readonly ModelOption[] = [
  // mock: verify against Google AI Studio docs in the backend phase
  {
    id: "imagen-3.0-generate-002",
    name: "Imagen 3 (Recommended)",
    description: "High-fidelity photorealism • Optimized for commercial social graphics",
  },
  // mock: verify against Google AI Studio docs in the backend phase
  {
    id: "imagen-3.0-fast-generate-001",
    name: "Imagen 3 Fast",
    description: "Lower latency generation for rapid batch prototyping",
  },
] as const;

export const MOCK_CONFIG = {
  minDurationMs: 8000,
  maxDurationMs: 20000,
  defaultMaxConcurrent: 3,
  mockFailureRate: 0.1,
  verifyLatencyMs: 1200,
  testImageDurationMs: 2000,
} as const;
