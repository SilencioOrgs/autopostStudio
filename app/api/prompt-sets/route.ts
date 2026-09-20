import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const supabase = await createClient();
    const { data: sets, error } = await supabase
      .from("prompt_sets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess(sets || []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch prompt sets";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
