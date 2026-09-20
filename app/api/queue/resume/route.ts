import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ generation_paused: false })
      .eq("id", user.id);

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess({ paused: false, message: "Generation runner resumed." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resume runner";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
