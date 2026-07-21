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

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: {
    openNow?: boolean;
  };
  primaryType?: string;
  types?: string[];
  photos?: Array<{
    name?: string;
  }>;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
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

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadiusKm = 6371;

  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const latDifference = toRadians(lat2 - lat1);
  const lngDifference = toRadians(lng2 - lng1);

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(lngDifference / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}

function mapGoogleCategory(
  primaryType?: string,
  types: string[] = []
): NearbyCategory {
  const categoryText = [
    primaryType ?? "",
    ...types,
  ]
    .join(" ")
    .toLowerCase();

  if (
    categoryText.includes("restaurant") ||
    categoryText.includes("cafe") ||
    categoryText.includes("bakery") ||
    categoryText.includes("food")
  ) {
    return "Food";
  }

  if (
    categoryText.includes("bar") ||
    categoryText.includes("night_club") ||
    categoryText.includes("pub")
  ) {
    return "Nightlife";
  }

  if (
    categoryText.includes("stadium") ||
    categoryText.includes("gym") ||
    categoryText.includes("sports")
  ) {
    return "Sports";
  }

  if (
    categoryText.includes("park") ||
    categoryText.includes("beach") ||
    categoryText.includes("hiking") ||
    categoryText.includes("tourist_attraction")
  ) {
    return "Outdoor";
  }

  return "Events";
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

const googleResponse = await fetch(
  "https://places.googleapis.com/v1/places:searchNearby",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.currentOpeningHours",
        "places.primaryType",
        "places.types",
      ].join(","),
    },

    body: JSON.stringify({
      includedTypes: [
        "restaurant",
        "cafe",
        "bar",
        "night_club",
        "park",
        "tourist_attraction",
        "movie_theater",
        "gym",
      ],

      maxResultCount: 20,

      locationRestriction: {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: 5000,
        },
      },
    }),

    cache: "no-store",
  }
);

if (!googleResponse.ok) {
  const googleError =
    await googleResponse.text();

  console.error(
    "Google Places request failed:",
    googleResponse.status,
    googleError
  );

  return NextResponse.json(
    {
      error:
        "Unable to retrieve nearby places.",
    },
    {
      status: 502,
    }
  );
}

const googleData =
  (await googleResponse.json()) as GooglePlacesResponse;

const googlePlaces =
  Array.isArray(googleData.places)
    ? googleData.places
    : [];

const providerResults: NearbySpot[] =
  googlePlaces
    .map((place): NearbySpot | null => {
      const placeLatitude =
        place.location?.latitude;

      const placeLongitude =
        place.location?.longitude;

      if (
        typeof placeLatitude !== "number" ||
        typeof placeLongitude !== "number"
      ) {
        return null;
      }

      const category = mapGoogleCategory(
        place.primaryType,
        place.types
      );

      const isOpen =
        typeof place.currentOpeningHours?.openNow ===
        "boolean"
          ? place.currentOpeningHours.openNow
          : null;

      const distanceKm =
        calculateDistanceKm(
          latitude,
          longitude,
          placeLatitude,
          placeLongitude
        );

      return {
        id:
          place.id ??
          `${placeLatitude}-${placeLongitude}`,

        name:
          place.displayName?.text ??
          "Nearby place",

        category,

        distanceKm,

        vibe:
          category === "Nightlife"
            ? "Social"
            : category === "Food"
              ? "Relaxed"
              : category === "Outdoor"
                ? "Calm"
                : "Active",

        crowdLevel: "Unknown",

        status:
          isOpen === true
            ? "Open"
            : isOpen === false
              ? "Closed"
              : "Status unavailable",

        note:
          place.formattedAddress ??
          "Nearby place",

        address:
          place.formattedAddress ?? null,

        rating:
          typeof place.rating === "number"
            ? place.rating
            : null,

        reviewCount:
          typeof place.userRatingCount ===
          "number"
            ? place.userRatingCount
            : null,

        isOpen,

        photoUrl: null,

        latitude: placeLatitude,
        longitude: placeLongitude,
      };
    })
    .filter(
      (
        place
      ): place is NearbySpot =>
        place !== null
    );
  
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
      source: "google-places",
      latitude,
      longitude,
      resultCount: spots.length,
      generatedAt: new Date().toISOString(),
    },
  });
}