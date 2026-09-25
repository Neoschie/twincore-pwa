import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://localhost",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type GooglePlaceDetails = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  currentOpeningHours?: {
    openNow?: boolean;
    nextCloseTime?: string;
  };
};

function mapCategory(primaryType?: string) {
  const type = (primaryType || "").toLowerCase();

  if (
    type.includes("restaurant") ||
    type.includes("cafe") ||
    type.includes("bakery") ||
    type.includes("food")
  ) {
    return "Food";
  }

  if (
    type.includes("night_club") ||
    type.includes("bar") ||
    type.includes("pub")
  ) {
    return "Nightlife";
  }

  if (
    type.includes("gym") ||
    type.includes("stadium") ||
    type.includes("sport")
  ) {
    return "Sports";
  }

  if (
    type.includes("park") ||
    type.includes("beach") ||
    type.includes("campground") ||
    type.includes("marina")
  ) {
    return "Outdoor";
  }

  return "Events";
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const placeId = requestUrl.searchParams.get("placeId")?.trim();

  if (!placeId) {
    return NextResponse.json(
      { error: "A placeId value is required." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Places provider is not configured." },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  const googleResponse = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "rating",
          "userRatingCount",
          "primaryType",
          "currentOpeningHours",
        ].join(","),
      },
      cache: "no-store",
    },
  );

  if (!googleResponse.ok) {
    console.error("Google Place Details request failed:", googleResponse.status);

    return NextResponse.json(
      { error: "Unable to retrieve venue details." },
      { status: 502, headers: CORS_HEADERS },
    );
  }

  const place = (await googleResponse.json()) as GooglePlaceDetails;

  if (!place.id || !place.displayName?.text) {
    return NextResponse.json(
      { error: "Venue details are unavailable." },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      venue: {
        id: place.id,
        name: place.displayName.text,
        category: mapCategory(place.primaryType),
        address: place.formattedAddress ?? null,
        rating: typeof place.rating === "number" ? place.rating : null,
        reviewCount:
          typeof place.userRatingCount === "number"
            ? place.userRatingCount
            : null,
        isOpen:
          typeof place.currentOpeningHours?.openNow === "boolean"
            ? place.currentOpeningHours.openNow
            : null,
        closingTime: place.currentOpeningHours?.nextCloseTime ?? null,
      },
    },
    { headers: CORS_HEADERS },
  );
}
