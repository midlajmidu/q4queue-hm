/**
 * app/[orgSlug]/dashboard/utils/formatters.ts
 * Dashboard utility and formatting helpers.
 */

export function formatDuration(s: number): string {
  if (!s || s < 0) return "—";

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.round(s % 60);

  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes >= 1) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

export function statusLabel(act: { number: number; status: string; queue: string; customer_name?: string }): string {
  return act.customer_name && act.customer_name !== "-" ? toTitleCase(act.customer_name) : `Customer #${act.number}`;
}
