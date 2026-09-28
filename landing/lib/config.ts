/**
 * landing/lib/config.ts
 * Centralized configuration for the marketing site.
 */

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const normalizedApiUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const config = {
  apiBaseUrl: normalizedApiUrl,
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Q4Queue",
  landingUrl: process.env.NEXT_PUBLIC_LANDING_URL || "https://q4queue.com",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://app.q4queue.com",
  isProduction: process.env.NODE_ENV === "production",
} as const;
