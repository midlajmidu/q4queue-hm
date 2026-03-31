/**
 * lib/config.ts
 * Centralized configuration — all env vars validated here.
 * No env access anywhere else in the codebase.
 */



// Normalize URLs to remove trailing slashes for consistency
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const normalizedApiUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const config = {
  // Primary API entry point
  apiBaseUrl: normalizedApiUrl,

  // WebSocket URL calculation
  wsBaseUrl: process.env.NEXT_PUBLIC_WS_BASE_URL || (function() {
    if (normalizedApiUrl.startsWith('http')) return normalizedApiUrl.replace('http', 'ws') + '/ws';
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}${normalizedApiUrl}/ws`;
    }
    return `ws://localhost:3000${normalizedApiUrl}/ws`;
  })(),

  appName: process.env.NEXT_PUBLIC_APP_NAME || "Q4Queue",
  isProduction: process.env.NODE_ENV === "production",
} as const;
