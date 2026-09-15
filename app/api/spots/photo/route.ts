import { NextResponse } from "next/server";

const GOOGLE_PHOTO_RESOURCE =
  /^places\/[^/]+\/photos\/[^/]+$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get("name")?.trim();

  if (!photoName || !GOOGLE_PHOTO_RESOURCE.test(photoName)) {
    return NextResponse.json(
      { error: "A valid Google Places photo resource is required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Places photo provider is not configured." },
      { status: 503 },
    );
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=1200`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error(
      "Google Places photo proxy failed:",
      response.status,
    );

    return NextResponse.json(
      { error: "Unable to retrieve venue photo." },
      { status: 502 },
    );
  }

  const contentType =
    response.headers.get("content-type") || "image/jpeg";

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
