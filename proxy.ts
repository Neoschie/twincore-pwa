import { NextResponse, type NextRequest } from "next/server";

const PRELAUNCH_ENABLED = process.env.TWINCORE_PRELAUNCH === "true";

export function proxy(request: NextRequest) {
  if (!PRELAUNCH_ENABLED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Infrastructure required to render the pre-launch response.
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/twincore-prelaunch.html"
  ) {
    return NextResponse.next();
  }

  // Android App Links verification must remain publicly reachable.
  if (pathname === "/.well-known/assetlinks.json") {
    return NextResponse.next();
  }

  // Stripe must be able to deliver server-to-server webhook events.
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  // Authenticated APIs required by native store-review builds.
  if (
    pathname === "/api/prelaunch/access" ||
    pathname === "/api/spots/nearby" ||
    pathname === "/api/spots/details"
  ) {
    return NextResponse.next();
  }

  // No other public app APIs are available before launch.
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  // Hide the application behind the standalone pre-launch page.
  const url = request.nextUrl.clone();
  url.pathname = "/twincore-prelaunch.html";
  url.search = "";

  return NextResponse.rewrite(url, {
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export const config = {
  matcher: ["/:path*"],
};
