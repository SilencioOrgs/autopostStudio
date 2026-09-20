import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

const SignupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be 30 characters or less")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    termsAccepted: z.literal(true, {
      message: "You must accept the Terms and Conditions",
    }),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = SignupSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400, {
        field: firstIssue.path.join("."),
        details: parsed.error.format(),
      });
    }

    const { username, email, password, termsAccepted } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          terms_accepted: termsAccepted ? "true" : "false",
          terms_version: "v1.0",
        },
      },
    });

    if (error) {
      return apiError("AUTH_INVALID_CREDENTIALS", error.message, 400);
    }

    return apiSuccess({
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            username,
            emailConfirmed: !!data.user.confirmed_at || !!data.user.email_confirmed_at,
          }
        : null,
      session: data.session ? true : false,
      message: "Account created successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
