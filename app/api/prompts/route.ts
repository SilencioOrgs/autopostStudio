import { type NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { computeContentHash, parseHashtags } from "@/app/_lib/services/import";
import { signImages } from "@/app/_lib/storage";

const CreatePromptSchema = z
  .object({
    imagePrompt: z.string().min(3, "Image prompt must be at least 3 characters"),
    caption: z.string().optional(),
    hashtags: z.union([z.array(z.string()), z.string()]).optional(),
    style: z.string().optional(),
    aspect: z.enum(["4:5", "1:1", "16:9"]).optional(),
    setId: z.string().uuid().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to access prompts.", 401);
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const setId = searchParams.get("setId");
    const q = searchParams.get("q");
    const sort = searchParams.get("sort") || "created";
    const direction = searchParams.get("direction") || "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
      .from("prompts")
      .select("*, generations(*)", { count: "exact" })
      .eq("user_id", user.id);

    const allowedPromptStatuses = [
      "draft",
      "queued",
      "generating",
      "ready",
      "approved",
      "scheduled",
      "posted",
      "failed",
    ] as const;
    type PromptStatusFilter = (typeof allowedPromptStatuses)[number];
    if (status && status !== "all" && (allowedPromptStatuses as readonly string[]).includes(status)) {
      query = query.eq("status", status as PromptStatusFilter);
    }

    if (setId) {
      query = query.eq("set_id", setId);
    }

    if (q) {
      query = query.or(`image_prompt.ilike.%${q}%,caption.ilike.%${q}%,style.ilike.%${q}%`);
    }

    const sortColumns = {
      number: "row_index",
      name: "image_prompt",
      style: "style",
      status: "status",
      created: "created_at",
    } as const;
    const sortColumn = sortColumns[sort as keyof typeof sortColumns] || sortColumns.created;
    const ascending = direction === "asc";

    query = query
      .order(sortColumn, { ascending })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: prompts, count, error } = await query;

    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    // Sign image storage paths in batch
    const pathsToSign: string[] = [];
    type GenerationSummary = { storage_path?: string | null; status?: string; created_at?: string };
    type PromptWithGens = typeof prompts extends (infer T)[] ? T & { generations?: GenerationSummary[] } : never;

    const promptList = (prompts || []) as unknown as PromptWithGens[];

    promptList.forEach((p) => {
      const gens = p.generations || [];
      gens.forEach((g) => {
        if (g.storage_path) pathsToSign.push(g.storage_path);
      });
    });

    const signedUrls = await signImages(pathsToSign);

    const promptsWithImages = promptList.map((p) => {
      const gens = p.generations || [];
      const succeededGen = gens
        .filter((g) => g.status === "succeeded")
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
      const targetGen = succeededGen || gens[0];
      const imageUrl = targetGen?.storage_path ? (signedUrls[targetGen.storage_path] || null) : null;
      return {
        ...p,
        imageUrl,
      };
    });

    return apiSuccess({
      prompts: promptsWithImages,
      total: count || 0,
      page,
      limit,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch prompts";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to create prompts.", 401);
    }

    const json = await request.json().catch(() => null);
    if (!json) {
      return apiError("VALIDATION_ERROR", "Invalid JSON payload", 400);
    }

    const parsed = CreatePromptSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError("VALIDATION_ERROR", firstIssue.message, 400, {
        field: firstIssue.path.join("."),
      });
    }

    const { imagePrompt, caption, hashtags: rawTags, style, aspect, setId } = parsed.data;

    let hashtags: string[] = [];
    if (Array.isArray(rawTags)) {
      hashtags = rawTags.map((t) => (t.startsWith("#") ? t : `#${t}`));
    } else if (typeof rawTags === "string") {
      hashtags = parseHashtags(rawTags);
    }

    const contentHash = computeContentHash(imagePrompt, caption || "");

    const supabase = await createClient();

    // Check for duplicate
    const { data: existing } = await supabase
      .from("prompts")
      .select("id")
      .eq("user_id", user.id)
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (existing) {
      return apiError("VALIDATION_ERROR", "A prompt with this exact image prompt and caption already exists.", 400);
    }

    const { data: newPrompt, error } = await supabase
      .from("prompts")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        set_id: setId || null,
        image_prompt: imagePrompt.trim(),
        caption: caption?.trim() || null,
        hashtags,
        style: style?.trim() || null,
        aspect: aspect || "4:5",
        status: "draft",
        content_hash: contentHash,
      })
      .select()
      .single();

    if (error || !newPrompt) {
      return apiError("INTERNAL_ERROR", error?.message || "Failed to create prompt", 500);
    }

    return apiSuccess(newPrompt, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create prompt";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
