import { NextResponse } from "next/server";
import { getAuthorizedApiUser } from "@/lib/supabase/api-auth";

const ALLOWED_NATIVE_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
]);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin =
    origin && ALLOWED_NATIVE_ORIGINS.has(origin)
      ? origin
      : "https://localhost";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request);
  const user = await getAuthorizedApiUser(request);

  if (!user) {
    return NextResponse.json(
      { allowed: false },
      { status: 401, headers },
    );
  }

  return NextResponse.json(
    { allowed: true },
    { status: 200, headers },
  );
}
