/**
 * Client-safe board helpers. Keep database access in services/board.ts so a
 * Client Component can never pull the admin Supabase client into its bundle.
 */
export function getCalendarDays(timezone = "Asia/Manila", count = 14): { dateStr: string; title: string }[] {
  const result: { dateStr: string; title: string }[] = [];
  const dateStrFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const titleFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const target = new Date(now.getTime() + i * 86400000);
    result.push({ dateStr: dateStrFormatter.format(target), title: titleFormatter.format(target) });
  }
  return result;
}

export function calculateMidpointPosition(
  prevPosition?: number | null,
  nextPosition?: number | null
): number {
  if (prevPosition !== undefined && prevPosition !== null && nextPosition !== undefined && nextPosition !== null) {
    return (prevPosition + nextPosition) / 2;
  }
  if (prevPosition !== undefined && prevPosition !== null) return prevPosition + 1000;
  if (nextPosition !== undefined && nextPosition !== null) return nextPosition / 2;
  return 1000;
}
