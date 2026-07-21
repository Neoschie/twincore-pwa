import { NextResponse } from "next/server";

type NearbyCategory =
  | "Food"
  | "Nightlife"
  | "Events"
  | "Sports"
  | "Outdoor"
  | "Stay In";

type NearbySpot = {
  id: string;
  name: string;
  category: NearbyCategory;
  distanceKm: number;
  vibe: string;
  crowdLevel: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  isOpen: boolean | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};

function parseCoordinate(
  value: string | null,
  minimum: number,
  maximum: number
) {
  if (!value) return null;

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    return null;
  }

  return parsedValue;
}

function normalizeSpot(
  spot: NearbySpot
): NearbySpot {
  return {
    id: spot.id.trim(),
    name: spot.name.trim(),
    category: spot.category,
    distanceKm: Math.max(
      0,
      Number(spot.distanceKm.toFixed(1))
    ),
    vibe: spot.vibe.trim(),
    crowdLevel: spot.crowdLevel.trim(),
    address: spot.address?.trim() || null,
    rating:
      typeof spot.rating === "number"
        ? Number(spot.rating.toFixed(1))
        : null,
    reviewCount:
      typeof spot.reviewCount === "number"
        ? Math.max(0, spot.reviewCount)
        : null,
    isOpen: spot.isOpen,
    photoUrl: spot.photoUrl,
    latitude: spot.latitude,
    longitude: spot.longitude,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const latitude = parseCoordinate(
    searchParams.get("lat"),
    -90,
    90
  );

  const longitude = parseCoordinate(
    searchParams.get("lng"),
    -180,
    180
  );

  if (latitude === null || longitude === null) {
    return NextResponse.json(
      {
        error:
          "Valid latitude and longitude values are required.",
      },
      { status: 400 }
    );
  }

  /*
   * Temporary provider data.
   *
   * Later, this array will be replaced by results from
   * Google Places, Foursquare, or another venue provider.
   * The frontend will not need to change because every
   * provider result will be converted into NearbySpot.
   */
 const apiKey = process.env.PLACES_API_KEY;
const baseUrl = process.env.PLACES_API_BASE_URL;

if (!apiKey || !baseUrl) {
  return NextResponse.json(
    {
      error: "Nearby provider is not configured.",
    },
    { status: 503 }
  );
}

const providerUrl = new URL(baseUrl);

providerUrl.searchParams.set(
  "lat",
  latitude.toString()
);

providerUrl.searchParams.set(
  "lng",
  longitude.toString()
);

providerUrl.searchParams.set(
  "radius",
  "5000"
);

const providerResponse = await fetch(
  providerUrl.toString(),
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  }
);

if (!providerResponse.ok) {
  console.error(
    "Nearby provider request failed:",
    providerResponse.status
  );

  return NextResponse.json(
    {
      error: "Nearby provider request failed.",
    },
    { status: 502 }
  );
}

const providerData = await providerResponse.json();

const rawPlaces = Array.isArray(providerData?.results)
  ? providerData.results
  : [];

  const providerResults: NearbySpot[] =
  rawPlaces.map((place: any, index: number) => {
    const categoryText =
      String(
        place.category ??
          place.type ??
          ""
      ).toLowerCase();

    let category: NearbyCategory = "Events";

    if (
      categoryText.includes("restaurant") ||
      categoryText.includes("food") ||
      categoryText.includes("cafe")
    ) {
      category = "Food";
    } else if (
      categoryText.includes("bar") ||
      categoryText.includes("club") ||
      categoryText.includes("night")
    ) {
      category = "Nightlife";
    } else if (
      categoryText.includes("park") ||
      categoryText.includes("trail") ||
      categoryText.includes("beach")
    ) {
      category = "Outdoor";
    } else if (
      categoryText.includes("sport") ||
      categoryText.includes("arena") ||
      categoryText.includes("gym")
    ) {
      category = "Sports";
    }

    return {
      id:
        String(
          place.id ??
            place.place_id ??
            `place-${index}`
        ),

      name:
        String(
          place.name ??
            "Nearby place"
        ),

      category,

      distanceKm:
        typeof place.distanceKm === "number"
          ? place.distanceKm
          : typeof place.distance === "number"
          ? place.distance / 1000
          : 0,

      vibe:
        String(
          place.vibe ??
            "Active"
        ),

      crowdLevel:
        String(
          place.crowdLevel ??
            "Unknown"
        ),

      status:
        place.isOpen === false
          ? "Closed"
          : "Open",

      note:
        String(
          place.description ??
            place.address ??
            "Nearby place"
        ),

      address:
        place.address ??
        place.formatted_address ??
        null,

      rating:
        typeof place.rating === "number"
          ? place.rating
          : null,

      reviewCount:
        typeof place.reviewCount === "number"
          ? place.reviewCount
          : typeof place.user_ratings_total === "number"
          ? place.user_ratings_total
          : null,

      isOpen:
        typeof place.isOpen === "boolean"
          ? place.isOpen
          : typeof place.open_now === "boolean"
          ? place.open_now
          : null,

      photoUrl:
        typeof place.photoUrl === "string"
          ? place.photoUrl
          : null,

      latitude:
        typeof place.latitude === "number"
          ? place.latitude
          : place.location?.lat ??
            null,

      longitude:
        typeof place.longitude === "number"
          ? place.longitude
          : place.location?.lng ??
            null,
    };
  });

  const spots = providerResults
    .map(normalizeSpot)
    .sort(
      (firstSpot, secondSpot) =>
        firstSpot.distanceKm -
        secondSpot.distanceKm
    );

  return NextResponse.json({
    spots,
    meta: {
      source: "live-provider",
      latitude,
      longitude,
      resultCount: spots.length,
      generatedAt: new Date().toISOString(),
    },
  });
}