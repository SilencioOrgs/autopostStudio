import { type NextRequest } from "next/server";
import crypto from "crypto";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { parsePromptSheet } from "@/app/_lib/services/import";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to import prompts.", 401);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return apiError("VALIDATION_ERROR", "Multipart form data is required.", 400);
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return apiError("VALIDATION_ERROR", "No file uploaded. Please provide a .xlsx or .csv file.", 400);
    }

    const filename = file.name || "prompts.xlsx";
    const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

    if (![".xlsx", ".csv"].includes(extension)) {
      return apiError(
        "IMPORT_INVALID_FILE",
        `Unsupported file format '${extension}'. Only .xlsx and .csv files are supported.`,
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError(
        "IMPORT_INVALID_FILE",
        `File size (${(file.size / (1024 * 1024)).toFixed(
          2
        )} MB) exceeds maximum allowed size of 5 MB.`,
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse sheet first to validate headers and structure
    let parsedSheet;
    try {
      parsedSheet = parsePromptSheet(buffer, filename);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : "Failed to parse spreadsheet";
      return apiError("IMPORT_BAD_HEADERS", msg, 400);
    }

    if (parsedSheet.rows.length === 0) {
      return apiError(
        "IMPORT_EMPTY_FILE",
        "The uploaded file does not contain any valid prompt rows.",
        400
      );
    }

    if (parsedSheet.rows.length > MAX_ROWS) {
      return apiError(
        "IMPORT_ROW_LIMIT_EXCEEDED",
        `Workbook contains ${parsedSheet.rows.length} rows, exceeding the limit of ${MAX_ROWS} rows.`,
        400
      );
    }

    const supabase = await createClient();
    const setId = crypto.randomUUID();

    // 2. Upload raw file to prompt-uploads bucket for audit and recovery
    const storagePath = `${user.id}/${setId}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("prompt-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) {
      // Non-fatal: log warning but continue importing rows
      console.warn("Could not archive raw workbook to storage:", uploadError.message);
    }

    // 3. Deduplication check against existing prompts for this user
    const contentHashes = parsedSheet.rows.map((r) => r.contentHash);
    const { data: existingPrompts } = await supabase
      .from("prompts")
      .select("content_hash")
      .eq("user_id", user.id)
      .in("content_hash", contentHashes);

    const existingHashSet = new Set((existingPrompts || []).map((p) => p.content_hash));

    const rowsToInsert = [];
    let skippedCount = 0;

    for (const row of parsedSheet.rows) {
      if (existingHashSet.has(row.contentHash)) {
        skippedCount++;
      } else {
        existingHashSet.add(row.contentHash); // prevent duplicates within the same sheet
        rowsToInsert.push({
          id: crypto.randomUUID(),
          user_id: user.id,
          set_id: setId,
          row_index: row.rowIndex,
          style: row.style || parsedSheet.style || null,
          image_prompt: row.imagePrompt,
          caption: row.caption,
          hashtags: row.hashtags,
          aspect: "4:5" as const,
          status: "draft" as const,
          content_hash: row.contentHash,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 4. Insert prompt_sets row
    const { error: setInsertError } = await supabase.from("prompt_sets").insert({
      id: setId,
      user_id: user.id,
      name: parsedSheet.setName,
      source: "upload",
      source_filename: filename,
      style: parsedSheet.style,
      total_rows: rowsToInsert.length,
      created_at: new Date().toISOString(),
    });

    if (setInsertError) {
      return apiError("INTERNAL_ERROR", setInsertError.message, 500);
    }

    // 5. Insert prompts rows in chunks of 100
    if (rowsToInsert.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
        const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
        const { error: promptsInsertError } = await supabase.from("prompts").insert(chunk);
        if (promptsInsertError) {
          return apiError("INTERNAL_ERROR", promptsInsertError.message, 500);
        }
      }
    }

    return apiSuccess(
      {
        setId,
        setName: parsedSheet.setName,
        inserted: rowsToInsert.length,
        skipped: skippedCount,
        errors: parsedSheet.errors,
      },
      201
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Workbook import failed";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
