import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ queueId: string }> | { queueId: string } }
) {
  const params = await Promise.resolve(context.params);
  const queueId = params.queueId;

  // Resolve backend URL
  const defaultBackend = process.env.NODE_ENV === "production" ? "http://backend:8000" : "http://127.0.0.1:8000";
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiUrlBase = rawApiUrl && rawApiUrl.startsWith("http") ? rawApiUrl.replace(/\/api\/v1\/?$/, "") : undefined;
  const backendUrl = (process.env.BACKEND_URL || apiUrlBase || defaultBackend).replace(/\/$/, "");

  const search = request.nextUrl.search;
  const targetUrl = `${backendUrl}/api/v1/queues/${queueId}/scan${search}`;

  try {
    const backendRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": request.headers.get("accept") || "*/*",
        "User-Agent": request.headers.get("user-agent") || "",
        ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
      },
      redirect: "manual",
    });

    // Check if backend returned a redirect (FastAPI returns 307 Temporary Redirect)
    const location = backendRes.headers.get("location");
    if (location) {
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
        const proto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
        const clientOrigin = `${proto}://${host}`;
        const locationUrl = new URL(location, clientOrigin);

        const finalRedirectUrl = new URL(
          `${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`,
          clientOrigin
        );

        return NextResponse.redirect(finalRedirectUrl, 307);
    }

    // If backend returned a non-redirect (e.g. JSON error or 404)
    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[QR Scan Proxy] Error connecting to backend:", err);
    // If backend is unreachable, redirect to join page with helpful error parameter
    return NextResponse.redirect(
      new URL(`/join/${queueId}?error=backend_unreachable`, request.nextUrl.origin),
      307
    );
  }
}

export const HEAD = GET;
