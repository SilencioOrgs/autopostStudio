import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { saveFacebookPage } from "@/app/_lib/services/facebook";

const ConnectPageSchema = z
  .object({
    pageId: z.string().min(1, "Page ID is required").max(64),
    token: z.string().min(10, "Page Access Token is required"),
    pageName: z.string().max(100).optional(),
  })
  .strict();

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to view connected pages.", 401);
    }

    const supabase = await createClient();
    const { data: pages, error } = await supabase
      .from("facebook_pages")
      .select(
        "id, page_id, page_name, category, followers_count, token_last4, token_status, token_expires_at, last_verified_at, is_default, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    return apiSuccess(pages || []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch Facebook pages";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to connect a Facebook Page.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    // Reject if client attempts to pass user_id (§4 rule 3)
    if ("user_id" in json || "userId" in json) {
      return apiError("VALIDATION_ERROR", "user_id cannot be provided by the client.", 400);
    }

    const parsed = ConnectPageSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400, {
        field: firstIssue.path.join("."),
      });
    }

    const { pageId, token, pageName: customName } = parsed.data;

    try {
      const page = await saveFacebookPage(user.id, {
        pageId,
        token,
        pageName: customName,
      });
      return apiSuccess(page, 201);
    } catch (saveErr: unknown) {
      const errorCode = (saveErr as { errorCode?: string })?.errorCode;
      const message = saveErr instanceof Error ? saveErr.message : "Failed to save Facebook Page";
      if (errorCode) {
        return apiError(errorCode, message, 400);
      }
      return apiError("INTERNAL_ERROR", message, 500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect Facebook Page";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
