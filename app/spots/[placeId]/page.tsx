import Link from "next/link";

import InviteCrewButton from "./InviteCrewButton";
import SaveVenueButton from "./SaveVenueButton";
import ShareVenueButton from "./ShareVenueButton";
import VenueRealtimeIntelligence from "./VenueRealtimeIntelligence";
import NativeVenueDetails from "./NativeVenueDetails";

type VenueDetailsPageProps = {
  params: Promise<{
    placeId: string;
  }>;
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

type VenueDetails = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  isOpen: boolean | null;
  closingTime: string | null;
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

function formatClosingTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getVenueDetails(
  placeId: string,
): Promise<VenueDetails | null> {
  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) {
    console.error("PLACES_API_KEY is not configured.");
    return null;
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      placeId,
    )}`,
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

  if (!response.ok) {
    console.error(
      "Google Place Details request failed:",
      response.status,
    );

    return null;
  }

  const place = (await response.json()) as GooglePlaceDetails;

  if (!place.id || !place.displayName?.text) {
    return null;
  }

  return {
    id: place.id,
    name: place.displayName.text,
    category: mapCategory(place.primaryType),
    address: place.formattedAddress ?? null,
    rating:
      typeof place.rating === "number" ? place.rating : null,
    reviewCount:
      typeof place.userRatingCount === "number"
        ? place.userRatingCount
        : null,
    isOpen:
      typeof place.currentOpeningHours?.openNow === "boolean"
        ? place.currentOpeningHours.openNow
        : null,
    closingTime:
      place.currentOpeningHours?.nextCloseTime ?? null,
  };
}

export default async function VenueDetailsPage({
  params,
}: VenueDetailsPageProps) {
  const { placeId } = await params;
  const decodedPlaceId = decodeURIComponent(placeId);

  if (decodedPlaceId === "__native__") {
    return <NativeVenueDetails />;
  }

  const venue = await getVenueDetails(decodedPlaceId);

  if (!venue) {
    return (
      <main className="min-h-screen bg-[#07090d] px-4 pb-24 pt-6 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/spots"
            className="inline-flex rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/70"
          >
            ← Back to Spots
          </Link>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h1 className="text-2xl font-black">
              Venue details unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/55">
              TwinCore could not verify this venue with the live
              Places provider. Return to Spots and try again.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const closingLabel = formatClosingTime(venue.closingTime);

  const directionsUrl = venue.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        venue.address,
      )}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        venue.name,
      )}`;

  const venueUrl =
    `/spots/${encodeURIComponent(venue.id)}`;

  return (
    <main className="min-h-screen bg-[#07090d] px-4 pb-24 pt-6 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/spots"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          ← Back to Spots
        </Link>

        <section className="relative h-64 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-violet-500/30">
          <div className="absolute inset-0 bg-black/25" />

          <div className="absolute left-5 top-5 rounded-full border border-emerald-300/20 bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-100 backdrop-blur-md">
            ● Verified venue
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-6 pt-20">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">
              {venue.category}
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {venue.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
              {venue.address ? (
                <span>📍 {venue.address}</span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {typeof venue.rating === "number" ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  ★ {venue.rating.toFixed(1)}
                  {typeof venue.reviewCount === "number"
                    ? ` (${venue.reviewCount})`
                    : ""}
                </span>
              ) : null}

              {venue.isOpen === true ? (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {closingLabel
                    ? `Open now · Closes ${closingLabel}`
                    : "Open now"}
                </span>
              ) : venue.isOpen === false ? (
                <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-semibold text-red-100">
                  Closed
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                  Status unavailable
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
              Quick Actions
            </div>

            <h2 className="mt-2 text-xl font-black text-white">
              Plan your next move
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-left transition hover:bg-cyan-300/15"
            >
              <div className="text-xl">🧭</div>
              <div className="mt-3 text-sm font-black text-white">
                Directions
              </div>
              <div className="mt-1 text-xs text-white/45">
                Open route
              </div>
            </a>

            <SaveVenueButton
              venueId={venue.id}
              venueName={venue.name}
            />

            <InviteCrewButton
              venueName={venue.name}
              venueUrl={venueUrl}
            />

            <ShareVenueButton
              venueName={venue.name}
              venueUrl={venueUrl}
            />
          </div>
        </section>

        <VenueRealtimeIntelligence venueName={venue.name} />
      </div>
    </main>
  );
}
