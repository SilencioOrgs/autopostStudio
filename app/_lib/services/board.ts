import "server-only";
import { getSupabaseAdminClient } from "@/app/_lib/supabase/admin";
import type { Database } from "@/app/_lib/db/types";

type BoardColumn = Database["public"]["Tables"]["board_columns"]["Row"];

/**
 * Ensures a user has a single canonical Backlog column (board_date: null).
 * Does NOT generate fixed dates — dates are added dynamically and manually by the user.
 * Deduplicates any extraneous backlog columns that may have been created earlier.
 */
export async function ensureBoardColumns(userId: string): Promise<BoardColumn[]> {
  const admin = getSupabaseAdminClient();

  // 1. Fetch all backlog columns for this user
  const { data: backlogs } = await admin
    .from("board_columns")
    .select("*")
    .eq("user_id", userId)
    .is("board_date", null)
    .order("created_at", { ascending: true });

  let canonicalBacklog = backlogs?.[0] || null;

  if (!canonicalBacklog) {
    const { data: newCol, error } = await admin
      .from("board_columns")
      .insert({
        user_id: userId,
        board_date: null,
        title: "Backlog",
        position: 0,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create canonical backlog column:", error.message);
    }
    canonicalBacklog = newCol;
  } else if (backlogs && backlogs.length > 1) {
    // Reassign all cards from duplicate backlogs to the canonical one
    const extraIds = backlogs.slice(1).map((b) => b.id);
    await admin
      .from("board_cards")
      .update({ column_id: canonicalBacklog.id })
      .in("column_id", extraIds)
      .eq("user_id", userId);

    await admin
      .from("board_columns")
      .delete()
      .in("id", extraIds)
      .eq("user_id", userId);
  }

  // 2. Fetch all current columns for the user
  const { data: allCols } = await admin
    .from("board_columns")
    .select("*")
    .eq("user_id", userId);

  const backlog = (allCols || []).find((c) => !c.board_date) || canonicalBacklog;
  const datedCols = (allCols || [])
    .filter((c) => c.board_date)
    .sort((a, b) => (a.board_date || "").localeCompare(b.board_date || ""));

  return backlog ? [backlog, ...datedCols] : datedCols;
}

/**
 * Dynamically adds a date column manually.
 */
export async function addDateColumn(
  userId: string,
  dateStr: string,
  customTitle?: string
): Promise<BoardColumn> {
  const admin = getSupabaseAdminClient();

  // Check if column already exists
  const { data: existing } = await admin
    .from("board_columns")
    .select("*")
    .eq("user_id", userId)
    .eq("board_date", dateStr)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Format friendly title (e.g. "Tue, Sep 22")
  let title = customTitle;
  if (!title) {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      title = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      title = dateStr;
    }
  }

  // Determine next position
  const { data: allCols } = await admin
    .from("board_columns")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = (allCols?.[0]?.position ?? 0) + 1;

  const { data: newCol, error } = await admin
    .from("board_columns")
    .insert({
      user_id: userId,
      board_date: dateStr,
      title: title || dateStr,
      position: nextPos,
    })
    .select("*")
    .single();

  if (error || !newCol) {
    throw new Error(error?.message || "Failed to create date column");
  }

  return newCol;
}

/**
 * Deletes a date column. Any cards inside are moved safely back to the Backlog.
 */
export async function deleteDateColumn(userId: string, columnId: string): Promise<void> {
  const admin = getSupabaseAdminClient();

  // Check column
  const { data: col } = await admin
    .from("board_columns")
    .select("*")
    .eq("id", columnId)
    .eq("user_id", userId)
    .single();

  if (!col) return;
  if (!col.board_date) {
    throw new Error("Cannot delete Backlog column");
  }

  // Ensure Backlog exists
  const { data: backlogs } = await admin
    .from("board_columns")
    .select("id")
    .eq("user_id", userId)
    .is("board_date", null)
    .order("created_at", { ascending: true })
    .limit(1);

  const backlogId = backlogs?.[0]?.id;

  // Move cards back to Backlog
  if (backlogId) {
    await admin
      .from("board_cards")
      .update({ column_id: backlogId, scheduled_at: null, status: "planned" })
      .eq("column_id", columnId)
      .eq("user_id", userId);
  }

  // Delete column
  const { error } = await admin
    .from("board_columns")
    .delete()
    .eq("id", columnId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
