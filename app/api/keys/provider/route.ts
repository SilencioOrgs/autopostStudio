import { getAuthUser } from "@/app/_lib/supabase/server";
import { apiError } from "@/app/_lib/errors";

async function unavailable() {
  const user = await getAuthUser();
  if (!user) return apiError("AUTH_UNAUTHORIZED", "Please sign in to continue.", 401);
  return apiError(
    "AI_PROVIDER_UNAVAILABLE",
    "Personal AI provider keys are disabled. Image generation is managed through Cloudflare Workers AI.",
    410
  );
}

export async function POST() {
  return unavailable();
}

export async function DELETE() {
  return unavailable();
}
