/**
 * tzformat.ts — Shared frontend time-formatting helpers.
 *
 * All branch admin pages and components MUST use these helpers
 * instead of calling toLocaleString/toLocaleTimeString directly.
 * This ensures timestamps always reflect the branch's configured timezone.
 */
import { tzAbbr } from "@/lib/timezones";

/**
 * Format a UTC ISO string as a time string in the given branch timezone.
 * Includes TZ abbreviation. Example: "09:00 AM IST"
 */
export function fmtTime(
  iso: string | null | undefined,
  tz: string,
  showAbbr = true
): string {
  if (!iso) return "—";
  const timeStr = new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
  return showAbbr ? `${timeStr} ${tzAbbr(tz)}` : timeStr;
}

/**
 * Format a UTC ISO string as a full date + time in the given branch timezone.
 * Example: "Jul 25, 2024, 09:00 AM IST"
 */
export function fmtDateTime(
  iso: string | null | undefined,
  tz: string,
  showAbbr = true
): string {
  if (!iso) return "—";
  const dtStr = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
  return showAbbr ? `${dtStr} ${tzAbbr(tz)}` : dtStr;
}

/**
 * Format a UTC ISO string as a date-only string in the given branch timezone.
 * Example: "Jul 25, 2024"
 */
export function fmtDate(
  iso: string | null | undefined,
  tz: string
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });
}

/**
 * Format a UTC ISO string as a short date label.
 * Example: "Jul 25"
 */
export function fmtDateShort(
  iso: string | null | undefined,
  tz: string
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
}

/**
 * Return a Date object that represents the current moment interpreted
 * in the given branch timezone.
 *
 * Useful for computing "is this today?" checks client-side:
 *   nowInTz(tz).toLocaleDateString() === new Date(iso).toLocaleDateString("en-US", {timeZone: tz})
 */
export function nowInTz(tz: string): Date {
  // We parse the locale string back into a Date — this gives a Date object
  // whose .getHours(), .getDate() etc. reflect the branch-local wall time.
  const localStr = new Date().toLocaleString("en-US", { timeZone: tz });
  return new Date(localStr);
}

/**
 * Return today's date string (YYYY-MM-DD) in the given branch timezone.
 * Use this when building API date-range filter params.
 */
export function localTodayStr(tz: string): string {
  const n = nowInTz(tz);
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a duration in seconds as a human-readable string.
 * Example: 3660 → "1h 1m"
 */
export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format a raw "hour number" (0–23) as a time label in the given timezone.
 * Used for peak hour display on charts.
 * Example: 14 → "2 PM IST"
 */
export function fmtHourLabel(hour: number, tz: string, showAbbr = true): string {
  // Build a fake ISO string at that hour in UTC, then format in tz
  // Actually the hour from the backend is already in the tz (func.timezone applied server-side)
  const label = hour === 0 ? "12 AM" :
    hour < 12 ? `${hour} AM` :
    hour === 12 ? "12 PM" :
    `${hour - 12} PM`;
  return showAbbr ? `${label} ${tzAbbr(tz)}` : label;
}
