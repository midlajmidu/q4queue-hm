import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "standalone",

  async rewrites() {
    // Priority: 1. BACKEND_URL, 2. NEXT_PUBLIC_API_URL, 3. NEXT_PUBLIC_API_BASE_URL, 4. Docker Internal Fallback
    const backendUrl = process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/v1", "") ||
      "http://backend:8000";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: "/org-admin/:orgSlug/dashboard",
        destination: "/:orgSlug/dashboard",
      },
      {
        source: "/org-admin/:orgSlug/dashboard/:path*",
        destination: "/:orgSlug/dashboard/:path*",
      },
      {
        source: "/super-admin/:parentSlug/:orgSlug/dashboard",
        destination: "/:orgSlug/dashboard",
      },
      {
        source: "/super-admin/:parentSlug/:orgSlug/dashboard/:path*",
        destination: "/:orgSlug/dashboard/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/j/:queueId",
        destination: "/join/:queueId",
        permanent: true,
      },
      {
        source: "/d/:queueId",
        destination: "/display/:queueId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
