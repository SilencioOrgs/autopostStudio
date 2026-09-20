import { NextResponse } from "next/server";

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorDetail = {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  ok: false;
  error: ApiErrorDetail;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const ERROR_CODES = {
  // Authentication & Session
  AUTH_INVALID_CREDENTIALS: "Invalid email or password.",
  AUTH_EMAIL_NOT_VERIFIED: "Please verify your email address before continuing.",
  AUTH_TERMS_REQUIRED: "You must accept the Terms and Conditions to create an account.",
  AUTH_SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  AUTH_UNAUTHORIZED: "You must be signed in to perform this action.",
  AUTH_FORBIDDEN: "You do not have permission to perform this action.",

  // Facebook Graph API & Pages
  FB_TOKEN_INVALID: "The provided Facebook Page Access Token is invalid.",
  FB_TOKEN_EXPIRED: "Your Facebook Page Access Token has expired. Please reconnect your Page.",
  FB_PERMISSIONS_MISSING: "Token lacks required publishing permissions (pages_manage_posts).",
  FB_PAGE_NOT_FOUND: "Facebook Page ID not found or could not be accessed.",
  FB_TOKEN_MISMATCH: "The access token provided does not belong to the specified Page ID.",
  FB_RATE_LIMITED: "Meta Graph API rate limit reached. Please wait before retrying.",

  // Google AI Studio / Gemini BYO Key
  AI_KEY_MISSING: "No Google AI Studio key configured. Please add your key in Settings.",
  AI_KEY_INVALID: "The provided Google AI Studio key is invalid or rejected by Google.",
  AI_BILLING_REQUIRED: "Google AI Studio project requires active billing to generate images.",
  AI_API_NOT_ENABLED: "The Generative Language API is not enabled on your Google Cloud project.",
  AI_QUOTA_EXCEEDED: "Your Google AI Studio quota is exhausted. Generation resumes when your quota resets, or raise your limit in Google AI Studio.",
  AI_REGION_UNSUPPORTED: "Google AI Studio is not available in the current region.",

  // Sheet Ingestion
  IMPORT_INVALID_FILE: "Only .xlsx and .csv files up to 5 MB are supported.",
  IMPORT_BAD_HEADERS: "Missing required 'Image Prompt' column header in sheet.",
  IMPORT_ROW_LIMIT_EXCEEDED: "Workbook exceeds the maximum limit of 500 rows.",
  IMPORT_EMPTY_FILE: "The uploaded file does not contain any valid prompt rows.",

  // Publishing & Scheduling
  DAILY_CAP_REACHED: "Daily post limit reached for this day. Adjust the schedule or update your cap in Settings.",
  SCHEDULE_WINDOW_INVALID: "Scheduled time must be at least 1 minute in the future.",
  PROMPT_NOT_APPROVED: "This post cannot be scheduled because the prompt has not been approved.",
  GENERATION_NOT_READY: "Image generation is not complete or failed.",
  PAGE_NOT_CONNECTED: "Please select a valid connected Facebook Page with an active token.",

  // Generic & Validation
  VALIDATION_ERROR: "The submitted data failed validation.",
  RATE_LIMITED: "Too many requests. Please slow down and try again.",
  NOT_FOUND: "The requested resource was not found.",
  INTERNAL_ERROR: "An unexpected internal server error occurred. Please try again.",
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(
  code: ErrorCodeKey | string,
  customMessage?: string,
  status = 400,
  extra?: { field?: string; details?: unknown }
): NextResponse<ApiErrorResponse> {
  const message = customMessage || (ERROR_CODES as Record<string, string>)[code] || "An unexpected error occurred.";
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(extra?.field ? { field: extra.field } : {}),
        ...(extra?.details !== undefined ? { details: extra.details } : {}),
      },
    },
    { status }
  );
}
