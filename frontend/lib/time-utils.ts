/**
 * Formats a duration in seconds into a human-readable natural language string.
 *
 * @param {number | null | undefined} seconds - The duration in seconds to format.
 * @returns {string} The formatted duration string (e.g., "2h 15m", "45s").
 * 
 * @example
 * formatDuration(45)          // "45s"
 * formatDuration(930)         // "15m 30s"
 * formatDuration(8100)        // "2h 15m"
 * formatDuration(190800)      // "2 days 5h"
 * formatDuration(0)           // "0s"
 * formatDuration(null)        // "—"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return "—";
  }

  // Handle negative values by taking the absolute value, or return a placeholder
  const absSeconds = Math.max(0, Math.floor(seconds));

  if (absSeconds === 0) {
    return "0s";
  }

  const days = Math.floor(absSeconds / 86400);
  const hours = Math.floor((absSeconds % 86400) / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  // Logic for different time ranges
  
  // 1. More than 24 hours
  if (days >= 1) {
    return `${days} day${days > 1 ? "s" : ""} ${hours}h`;
  }

  // 2. 1 to 24 hours
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }

  // 3. 1 minute to 1 hour
  if (minutes >= 1) {
    return `${minutes}m ${secs}s`;
  }

  // 4. Less than 1 minute
  return `${secs}s`;
}
