import "server-only";
import * as XLSX from "xlsx";
import crypto from "crypto";

export interface ParsedPromptRow {
  rowIndex: number | null;
  style: string | null;
  imagePrompt: string;
  caption: string | null;
  hashtags: string[];
  contentHash: string;
}

export interface ParseWorkbookResult {
  setName: string;
  style: string | null;
  totalRowsFound: number;
  rows: ParsedPromptRow[];
  errors: Array<{ row: number; reason: string }>;
  headersFound: string[];
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function computeContentHash(imagePrompt: string, caption: string): string {
  const normalized = `${normalizeText(imagePrompt)}|${normalizeText(caption || "")}`;
  return crypto.createHash("sha256").update(normalized, "utf-8").digest("hex");
}

export function parseHashtags(raw: unknown): string[] {
  if (!raw) return [];
  const str = String(raw).trim();
  if (!str) return [];

  return str
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

/**
 * Normalizes header string for alias comparison.
 */
function cleanHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9+#]/g, "").trim();
}

/**
 * Parses an Excel (.xlsx) or CSV buffer into strongly typed prompt rows.
 */
export function parsePromptSheet(
  buffer: Buffer,
  filename: string
): ParseWorkbookResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("The uploaded workbook does not contain any sheets.");
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      setName: deriveSetName(filename, firstSheetName),
      style: null,
      totalRowsFound: 0,
      rows: [],
      errors: [{ row: 0, reason: "The sheet is completely empty." }],
      headersFound: [],
    };
  }

  // Detect headers from first row
  const rawHeaders = Object.keys(rawRows[0]);
  const headersFound = [...rawHeaders];

  // Map header aliases
  let indexKey: string | null = null;
  let styleKey: string | null = null;
  let promptKey: string | null = null;
  let captionKey: string | null = null;
  let hashtagsKey: string | null = null;

  for (const h of rawHeaders) {
    const cleaned = cleanHeader(h);
    if (["no", "no.", "#", "index", "rowindex"].includes(cleaned)) {
      indexKey = h;
    } else if (["style", "category", "theme"].includes(cleaned)) {
      styleKey = h;
    } else if (
      ["imageprompt", "prompt", "image_prompt", "generationprompt"].includes(cleaned)
    ) {
      promptKey = h;
    } else if (
      [
        "facebookcaption+cta",
        "facebookcaptioncta",
        "caption",
        "fbcaption",
        "postcopy",
        "facebookcaption",
      ].includes(cleaned)
    ) {
      captionKey = h;
    } else if (["hashtags", "tags", "hashtag"].includes(cleaned)) {
      hashtagsKey = h;
    }
  }

  if (!promptKey) {
    throw new Error(
      `Missing required 'Image Prompt' column header. Found headers: [${rawHeaders.join(
        ", "
      )}]. Accepted aliases: 'Image Prompt', 'prompt', 'image prompt'.`
    );
  }

  const rows: ParsedPromptRow[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const stylesDetected = new Set<string>();

  rawRows.forEach((row, i) => {
    const rowNum = i + 2; // 1-indexed, accounting for header
    const rawPrompt = row[promptKey!];
    const imagePrompt = String(rawPrompt || "").trim();

    if (!imagePrompt) {
      errors.push({ row: rowNum, reason: "Image Prompt cell is blank." });
      return;
    }

    const rawIndex = indexKey ? row[indexKey] : null;
    const rowIndex = rawIndex !== null && !isNaN(Number(rawIndex)) ? Number(rawIndex) : null;

    const rawStyle = styleKey ? String(row[styleKey] || "").trim() : null;
    const style = rawStyle || null;
    if (style) stylesDetected.add(style);

    const rawCaption = captionKey ? String(row[captionKey] || "").trim() : null;
    const caption = rawCaption || null;

    const rawTags = hashtagsKey ? row[hashtagsKey] : "";
    const hashtags = parseHashtags(rawTags);

    const contentHash = computeContentHash(imagePrompt, caption || "");

    rows.push({
      rowIndex,
      style,
      imagePrompt,
      caption,
      hashtags,
      contentHash,
    });
  });

  const dominantStyle = stylesDetected.size > 0 ? Array.from(stylesDetected)[0] : null;
  const setName = deriveSetName(filename, firstSheetName, dominantStyle);

  return {
    setName,
    style: dominantStyle,
    totalRowsFound: rawRows.length,
    rows,
    errors,
    headersFound,
  };
}

/**
 * Derives a human-friendly prompt set name from filename or sheet name.
 */
export function deriveSetName(
  filename: string,
  sheetName?: string,
  style?: string | null
): string {
  // Strip extension
  const base = filename.replace(/\.[^/.]+$/, "");

  // If filename matches Casa_Pinoy_<Style>_50_Prompts, format cleanly
  const match = base.match(/^Casa_Pinoy_(.+)_\d+_Prompts$/i);
  if (match) {
    const formatted = match[1].replace(/_/g, " ");
    return `${formatted} Prompts`;
  }

  if (style) {
    return `${style} Prompts`;
  }

  if (sheetName && sheetName !== "Sheet1") {
    return sheetName;
  }

  return base.replace(/[-_]+/g, " ");
}
