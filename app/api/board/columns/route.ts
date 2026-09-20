import { type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { addDateColumn } from "@/app/_lib/services/board";

const CreateColumnSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    title: z.string().max(100).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = CreateColumnSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { date, title } = parsed.data;
    const newColumn = await addDateColumn(user.id, date, title);

    return apiSuccess(newColumn, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add date column";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
