import { createClient, getAuthUser } from "@/app/_lib/supabase/server";
import { apiError, apiSuccess } from "@/app/_lib/errors";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return apiError("AUTH_UNAUTHORIZED", "Please sign in to continue", 401);
    }

    const supabase = await createClient();

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Fetch Facebook pages (exclude ciphertext)
    const { data: pages } = await supabase
      .from("facebook_pages")
      .select(
        "id, page_id, page_name, category, followers_count, token_last4, token_status, token_expires_at, last_verified_at, is_default, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Query real stage counts
    const [
      { count: promptsCount },
      { count: generatingCount },
      { count: readyCount },
      { count: backlogCount },
      { count: scheduledCount },
      { count: publishedPostsCount },
      { count: publishedCardsCount },
    ] = await Promise.all([
      supabase.from("prompts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["pending", "running"]),
      supabase
        .from("prompts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "ready"),
      supabase
        .from("board_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "planned"),
      supabase
        .from("board_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "scheduled"),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "published"),
      supabase
        .from("board_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "published"),
    ]);

    const finalPublished = Math.max(publishedPostsCount || 0, publishedCardsCount || 0);
    const finalScheduled = scheduledCount || 0;
    const finalBacklog = backlogCount || 0;
    const finalBoardTotal = finalScheduled + finalBacklog;

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: Boolean(user.confirmed_at || user.email_confirmed_at),
      },
      profile: profile || {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || null,
        terms_accepted_at: null,
        terms_version: null,
        onboarding_completed_at: null,
        generation_paused: false,
        daily_post_cap: 3,
        board_days: 14,
        default_style_preset: null,
      },
      pages: pages || [],
      imageProvider: "cloudflare",
      onboardingCompleted: Boolean(profile?.onboarding_completed_at),
      counts: {
        prompts: promptsCount || 0,
        generating: generatingCount || 0,
        ready: readyCount || 0,
        backlog: finalBacklog,
        scheduled: finalScheduled,
        boardTotal: finalBoardTotal,
        published: finalPublished,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load user profile";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
