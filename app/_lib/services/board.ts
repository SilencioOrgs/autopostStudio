import "server-only";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import type { Database } from "@/app/_lib/db/types";
import { getCalendarDays } from "@/app/_lib/board-utils";

type BoardColumn = Database["public"]["Tables"]["board_columns"]["Row"];

/**
 * Computes calendar days for the user's timezone.
 * Returns dateStr in YYYY-MM-DD format and human title like "Sat, Sep 19" (no "Today" stored).
 */
/**
 * Ensures a user has a Backlog column and 14 day columns starting from today in their timezone.
 * Uses atomic upsert with ignoreDuplicates to avoid race conditions.
 */
export async function ensureBoardColumns(userId: string, daysCount = 14): Promise<BoardColumn[]> {
  const admin = getSupabaseAdminClient();

  // 1. Fetch user's profile to respect their configured timezone
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();

  const timezone = profile?.timezone || "Asia/Manila";
  const days = getCalendarDays(timezone, daysCount);

  // 2. Prepare payload: Backlog (board_date null) + calendar days
  const dayRows = days.map((d, idx) => ({
      user_id: userId,
      board_date: d.dateStr,
      title: d.title,
      position: idx + 1,
    }));

  // The baseline UNIQUE(user_id, board_date) covers dated columns. PostgreSQL
  // cannot infer the partial NULL-only Backlog index from this conflict target,
  // so insert the Backlog separately and accept its unique-violation race.
  const { error: backlogError } = await admin.from("board_columns").insert({
    user_id: userId,
    board_date: null,
    title: "Backlog",
    position: 0,
  });
  if (backlogError && backlogError.code !== "23505") {
    throw new Error("Failed to create board backlog");
  }

  // 3. Upsert calendar days with ignoreDuplicates to avoid races.
  const { error: daysError } = await admin.from("board_columns").upsert(dayRows, {
    onConflict: "user_id,board_date",
    ignoreDuplicates: true,
  });
  if (daysError) {
    throw new Error("Failed to create board columns");
  }

  // 4. Return current columns sorted by position
  const { data: allCols } = await admin
    .from("board_columns")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  return allCols || [];
}
