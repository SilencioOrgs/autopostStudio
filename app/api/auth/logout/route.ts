import { createClient } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess({ message: "Signed out successfully." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sign-out failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
