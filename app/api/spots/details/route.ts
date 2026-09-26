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
  types?: string[];
  currentOpeningHours?: {
    openNow?: boolean;
    nextCloseTime?: string;
  };
};

function mapCategory(
  primaryType?: string,
  types: string[] = [],
) {
  const allTypes = [primaryType ?? "", ...types].map((type) =>
    type.toLowerCase(),
  );

  const hasType = (...matches: string[]) =>
    allTypes.some((type) => matches.some((match) => type.includes(match)));

  if (
    hasType(
      "restaurant",
      "cafe",
      "bakery",
      "meal_takeaway",
      "meal_delivery",
      "food",
    )
  ) {
    return "Food";
  }

  if (hasType("night_club", "bar", "pub", "cocktail_bar", "wine_bar")) {
    return "Nightlife";
  }

  if (
    hasType(
      "gym",
      "stadium",
      "sports_complex",
      "sports_club",
      "athletic_field",
      "fitness",
    )
  ) {
    return "Sports";
  }

  if (
    hasType(
      "park",
      "beach",
      "hiking_area",
      "campground",
      "marina",
      "tourist_attraction",
      "nature_preserve",
    )
  ) {
    return "Outdoor";
  }

  if (
    hasType(
      "movie_theater",
      "performing_arts_theater",
      "event_venue",
      "concert_hall",
      "museum",
      "art_gallery",
    )
  ) {
    return "Events";
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
          "types",
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
        category: mapCategory(place.primaryType, place.types),
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
