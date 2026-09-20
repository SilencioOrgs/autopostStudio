import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const LoginSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = LoginSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400, {
        field: firstIssue.path.join("."),
      });
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return apiError("AUTH_INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    return apiSuccess({
      user: {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.confirmed_at || !!data.user.email_confirmed_at,
      },
      session: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sign-in failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
