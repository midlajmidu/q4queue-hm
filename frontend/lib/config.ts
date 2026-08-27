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

  // WebSocket URL calculation — automatically routes to backend port 8000 in dev
  wsBaseUrl: (function () {
    const rawWs = process.env.NEXT_PUBLIC_WS_BASE_URL;
    if (rawWs) {
      return rawWs.replace(':3000', ':8000');
    }
    if (normalizedApiUrl.startsWith('http')) {
      return normalizedApiUrl.replace(/^http/, 'ws').replace(':3000', ':8000') + '/ws';
    }
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = window.location.host;
      if (host.includes(':3000')) {
        host = host.replace(':3000', ':8000');
      }
      return `${protocol}//${host}${normalizedApiUrl}/ws`;
    }
    return `ws://127.0.0.1:8000${normalizedApiUrl}/ws`;
  })(),

  appName: process.env.NEXT_PUBLIC_APP_NAME || "Q4Queue",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://amoebaq.com",
  isProduction: process.env.NODE_ENV === "production",
  landingUrl: process.env.NEXT_PUBLIC_LANDING_URL || "https://amoebaq.com",
} as const;
