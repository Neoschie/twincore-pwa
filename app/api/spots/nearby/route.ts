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
  status: string;
  note: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  isOpen: boolean | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ProviderPlace = Partial<NearbySpot> & {
  place_id?: string;
  type?: string;
  distance?: number;
  description?: string;
  formatted_address?: string;
  user_ratings_total?: number;
  open_now?: boolean;
  location?: {
    lat?: number;
    lng?: number;
  };
  [key: string]: unknown;
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
  status: spot.status.trim(),
  note: spot.note.trim(),
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
  console.log(
    "Places key loaded:",
    Boolean(process.env.PLACES_API_KEY)
  );

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

if (!apiKey) {
  return NextResponse.json(
    {
      error: "Nearby provider is not configured.",
    },
    { status: 503 }
  );
}

const providerResults: NearbySpot[] = [
  {
    id: "harbour-social",
    name: "Harbour Social",
    category: "Nightlife",
    distanceKm: 0.6,
    vibe: "High Energy",
    crowdLevel: "Busy",
    status: "Open",
    note: "Busy social atmosphere with strong late-night activity.",
    address: "Waterfront District",
    rating: 4.5,
    reviewCount: 218,
    isOpen: true,
    photoUrl: null,
    latitude,
    longitude,
  },
  {
    id: "north-shore-kitchen",
    name: "North Shore Kitchen",
    category: "Food",
    distanceKm: 1.2,
    vibe: "Relaxed",
    crowdLevel: "Moderate",
    status: "Open",
    note: "Relaxed dining option nearby.",
    address: "North Shore",
    rating: 4.7,
    reviewCount: 164,
    isOpen: true,
    photoUrl: null,
    latitude,
    longitude,
  },
  {
    id: "waterfront-walk",
    name: "Waterfront Walk",
    category: "Outdoor",
    distanceKm: 0.9,
    vibe: "Calm",
    crowdLevel: "Light",
    status: "Open",
    note: "Calm outdoor option near the waterfront.",
    address: "Waterfront Trail",
    rating: 4.8,
    reviewCount: 92,
    isOpen: null,
    photoUrl: null,
    latitude,
    longitude,
  },
];
  
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
      source: "mock-provider",
      latitude,
      longitude,
      resultCount: spots.length,
      generatedAt: new Date().toISOString(),
    },
  });
}