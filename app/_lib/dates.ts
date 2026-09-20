/**
 * Date and time formatting helpers in UTC and target timezones (default Asia/Manila).
 * Pure functions using Intl.DateTimeFormat (no external date libraries).
 */

export const DEFAULT_TIMEZONE = "Asia/Manila";

export function now(): Date {
  return new Date();
}

export function getCurrentYear(): number {
  return now().getFullYear();
}

export function formatInZone(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...options,
  }).format(d);
}

export function formatShortDate(
  date: Date | string | number,
  timeZone = DEFAULT_TIMEZONE
): string {
  return formatInZone(
    date,
    { month: "short", day: "numeric" },
    timeZone
  );
}

export function formatMonthYear(
  date: Date | string | number,
  timeZone = DEFAULT_TIMEZONE
): string {
  return formatInZone(
    date,
    { month: "long", year: "numeric" },
    timeZone
  );
}

export function formatTime(
  date: Date | string | number,
  timeZone = DEFAULT_TIMEZONE
): string {
  return formatInZone(
    date,
    { hour: "numeric", minute: "2-digit", hour12: true },
    timeZone
  );
}

export function formatDateTime(
  date: Date | string | number,
  timeZone = DEFAULT_TIMEZONE
): string {
  return `${formatShortDate(date, timeZone)} at ${formatTime(date, timeZone)}`;
}

export function relativeDays(daysOffset: number, baseDate: Date = now()): Date {
  const target = new Date(baseDate);
  target.setDate(target.getDate() + daysOffset);
  return target;
}

export function getTimeOfDayGreeting(timeZone = DEFAULT_TIMEZONE): string {
  const hourStr = formatInZone(now(), { hour: "numeric", hour12: false }, timeZone);
  const hour = parseInt(hourStr, 10);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
