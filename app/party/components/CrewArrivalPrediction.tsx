"use client";

import { Clock3, MapPin, Navigation, Users } from "lucide-react";
import { calculateDistanceKm } from "@/lib/distance";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type CrewArrivalMember = {
  id: string;
  name: string;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  updatedAt?: string | null;
};

type CrewArrivalPredictionProps = {
  destination: Coordinates | null;
  destinationLabel: string;
  crewMembers: CrewArrivalMember[];
};

type ArrivalPrediction = CrewArrivalMember & {
  distanceKm: number | null;
  etaMinutes: number | null;
  arrived: boolean;
  travelMode: "arrived" | "walking" | "driving" | "unknown";
};

function estimateArrival(
  member: CrewArrivalMember,
  destination: Coordinates | null,
): ArrivalPrediction {
  const hasCoordinates =
    typeof member.latitude === "number" &&
    typeof member.longitude === "number";

  if (!destination || !hasCoordinates) {
    return {
      ...member,
      distanceKm: null,
      etaMinutes: null,
      arrived: false,
      travelMode: "unknown",
    };
  }

  const distanceKm = calculateDistanceKm(
    destination.latitude,
    destination.longitude,
    member.latitude as number,
    member.longitude as number,
  );

  if (distanceKm <= 0.1) {
    return {
      ...member,
      distanceKm,
      etaMinutes: 0,
      arrived: true,
      travelMode: "arrived",
    };
  }

  if (distanceKm <= 1.5) {
    const walkingSpeedKmH = 4.8;
    const etaMinutes = Math.max(
      1,
      Math.ceil((distanceKm / walkingSpeedKmH) * 60),
    );

    return {
      ...member,
      distanceKm,
      etaMinutes,
      arrived: false,
      travelMode: "walking",
    };
  }

  const estimatedDrivingSpeedKmH = 30;
  const etaMinutes = Math.max(
    3,
    Math.ceil((distanceKm / estimatedDrivingSpeedKmH) * 60) + 2,
  );

  return {
    ...member,
    distanceKm,
    etaMinutes,
    arrived: false,
    travelMode: "driving",
  };
}

function getArrivalLabel(prediction: ArrivalPrediction) {
  if (prediction.arrived) return "Already here";
  if (prediction.etaMinutes === null) return "Location unavailable";

  return `About ${prediction.etaMinutes} min`;
}

function getDistanceLabel(distanceKm: number | null) {
  if (distanceKm === null) return "Waiting for a live location";
  if (distanceKm < 0.1) return "At the destination";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;

  return `${distanceKm.toFixed(1)} km away`;
}

export default function CrewArrivalPrediction({
  destination,
  destinationLabel,
  crewMembers,
}: CrewArrivalPredictionProps) {
  const predictions = crewMembers
    .map((member) => estimateArrival(member, destination))
    .sort((first, second) => {
      if (first.etaMinutes === null) return 1;
      if (second.etaMinutes === null) return -1;
      return second.etaMinutes - first.etaMinutes;
    });

  const availablePredictions = predictions.filter(
    (prediction) => prediction.etaMinutes !== null,
  );

  const longestEta =
    availablePredictions.length > 0
      ? Math.max(
          ...availablePredictions.map(
            (prediction) => prediction.etaMinutes ?? 0,
          ),
        )
      : null;

  const arrivedCount = predictions.filter(
    (prediction) => prediction.arrived,
  ).length;

  const predictionMessage =
    !destination
      ? "Share your location to create a crew arrival prediction."
      : predictions.length === 0
        ? "TwinMe is waiting for live crew locations."
        : longestEta === null
          ? "Crew locations are not available yet."
          : longestEta === 0
            ? "The visible crew appears to be together."
            : `The visible crew may be together in approximately ${longestEta} minutes.`;

  return (
    <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,21,35,0.96),rgba(20,8,33,0.96))] p-5 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <Navigation className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Crew Arrival Prediction
            </p>

            <p className="mt-1 text-sm leading-6 text-white/55">
              Estimated from current crew coordinates and your shared location.
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
          {arrivedCount}/{predictions.length} here
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
        <MapPin className="h-4 w-4 shrink-0 text-fuchsia-200" />
        <span className="font-semibold text-white/85">
          Destination:
        </span>
        <span>{destinationLabel}</span>
      </div>

      {predictions.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {predictions.map((prediction) => (
            <article
              key={prediction.id}
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-white">
                    {prediction.name}
                  </div>

                  <div className="mt-1 text-xs text-white/45">
                    {prediction.status || "No current status"}
                  </div>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    prediction.arrived
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                      : prediction.etaMinutes !== null
                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/5 text-white/35"
                  }`}
                >
                  {getArrivalLabel(prediction)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <span className="text-white/45">
                  {getDistanceLabel(prediction.distanceKm)}
                </span>

                <span className="inline-flex items-center gap-1.5 font-semibold text-white/65">
                  <Clock3 className="h-3.5 w-3.5" />
                  {prediction.travelMode === "walking"
                    ? "Walking estimate"
                    : prediction.travelMode === "driving"
                      ? "Driving estimate"
                      : prediction.travelMode === "arrived"
                        ? "Arrived"
                        : "Waiting"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5 text-center text-sm text-white/45">
          No live crew locations are available yet.
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.06] p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.17em] text-fuchsia-200">
          <Users className="h-4 w-4" />
          TwinMe Prediction
        </div>

        <p className="mt-2 text-sm leading-6 text-white/75">
          {predictionMessage}
        </p>

        <p className="mt-2 text-xs leading-5 text-white/35">
          Estimates use straight-line distance and typical travel speeds.
          They do not yet include live traffic, road routing, or transit data.
        </p>
      </div>
    </section>
  );
}
