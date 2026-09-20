import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const BatchDeleteSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1, "At least one prompt ID is required"),
  })
  .strict();

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = BatchDeleteSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { ids } = parsed.data;
    const supabase = await createClient();

    const { error, count } = await supabase
      .from("prompts")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess({ deleted: true, count: count || ids.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Batch deletion failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
