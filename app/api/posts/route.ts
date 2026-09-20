import { type NextRequest } from "next/server";
import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { signImages } from "@/app/_lib/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to view posts.", 401);
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    const supabase = await createClient();

    let query = supabase
      .from("posts")
      .select(
        "*, facebook_pages(id, page_id, page_name, category), prompts(id, image_prompt, caption, hashtags, style), generations(storage_path)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const allowedStatuses = ["scheduled", "failed", "cancelled", "published"] as const;
    type PostStatus = (typeof allowedStatuses)[number];
    if (status && status !== "all" && (allowedStatuses as readonly string[]).includes(status)) {
      query = query.eq("status", status as PostStatus);
    }

    const { data: posts, error } = await query;
    if (error) {
      return apiError("INTERNAL_ERROR", error.message, 500);
    }

    // Generate signed URLs for private images in batch
    const pathsToSign: string[] = [];
    (posts || []).forEach((p) => {
      const storagePath = (p.generations as { storage_path?: string } | null)?.storage_path;
      if (storagePath) pathsToSign.push(storagePath);
    });

    const signedUrls = await signImages(pathsToSign);

    const postsWithImages = (posts || []).map((post) => {
      const storagePath = (post.generations as { storage_path?: string } | null)?.storage_path;
      const imageUrl = storagePath ? (signedUrls[storagePath] || null) : null;
      return {
        ...post,
        imageUrl,
      };
    });

    return apiSuccess(postsWithImages);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load posts";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
