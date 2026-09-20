import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";
import { ensureBoardColumns } from "@/app/_lib/services/board";
import { signImages } from "@/app/_lib/storage";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to view your posting board.", 401);
    }

    const supabase = await createClient();

    // 1. Ensure Backlog + 14 day columns exist
    const columns = await ensureBoardColumns(user.id, 14);

    // 2. Fetch all cards with joined details
    const { data: cards, error: cardsError } = await supabase
      .from("board_cards")
      .select(
        "*, prompts(*), generations(*), facebook_pages(id, page_id, page_name, category, followers_count, token_last4, token_status)"
      )
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (cardsError) {
      return apiError("INTERNAL_ERROR", cardsError.message, 500);
    }

    // 3. Create signed URLs in batch for images stored in private bucket
    const pathsToSign: string[] = [];
    (cards || []).forEach((c) => {
      const storagePath = (c.generations as { storage_path?: string } | null)?.storage_path;
      if (storagePath) pathsToSign.push(storagePath);
    });

    const signedUrls = await signImages(pathsToSign);

    const cardsWithSignedUrls = (cards || []).map((card) => {
      const storagePath = (card.generations as { storage_path?: string } | null)?.storage_path;
      const imageUrl = storagePath ? (signedUrls[storagePath] || null) : null;
      return {
        ...card,
        imageUrl,
      };
    });

    return apiSuccess({
      columns,
      cards: cardsWithSignedUrls,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load board";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
