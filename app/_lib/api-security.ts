import "server-only";
import { type NextRequest } from "next/server";
import { apiError } from "@/app/_lib/errors";

/** Reject cross-site cookie-authenticated mutations. */
export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin !== request.nextUrl.origin) {
    return apiError("AUTH_FORBIDDEN", "This request must come from this application.", 403);
  }
  return null;
}
