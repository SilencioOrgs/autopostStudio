import { type NextRequest } from "next/server";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { deleteDateColumn } from "@/app/_lib/services/board";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const { id } = await params;
    await deleteDateColumn(user.id, id);

    return apiSuccess({ deleted: true, columnId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete column";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
