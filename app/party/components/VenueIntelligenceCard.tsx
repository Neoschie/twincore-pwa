"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  MapPin,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  readVenueRecommendation,
  subscribeToVenueRecommendation,
  type SharedVenueRecommendation,
} from "@/lib/twinme/venue-recommendation-bridge";

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function VenueIntelligenceCard() {
  const [recommendation, setRecommendation] =
    useState<SharedVenueRecommendation | null>(null);

  useEffect(() => {
    const refresh = () => {
      setRecommendation(readVenueRecommendation());
    };

    refresh();
    return subscribeToVenueRecommendation(refresh);
  }, []);

  const hasRecommendation =
    recommendation &&
    recommendation.matchConfidence > 0 &&
    recommendation.spotName !== "No recommendation yet";

  return (
    <section className="mb-6 rounded-[2rem] border border-blue-400/20 bg-[linear-gradient(135deg,rgba(10,18,42,0.97),rgba(24,8,39,0.96))] p-5 shadow-[0_0_46px_rgba(59,130,246,0.09)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-300/25 bg-blue-300/10 text-blue-100">
            <Sparkles className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
              TwinMe Venue Intelligence
            </p>

            <p className="mt-1 text-sm leading-6 text-white/55">
              Your strongest nearby venue recommendation from Spots.
            </p>
          </div>
        </div>

        {hasRecommendation ? (
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
            {recommendation.matchConfidence}% match
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
            Waiting
          </span>
        )}
      </div>

      {hasRecommendation ? (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                  <MapPin className="h-3.5 w-3.5" />
                  Best nearby option
                </div>

                <h3 className="mt-2 text-xl font-black text-white">
                  {recommendation.spotName}
                </h3>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs text-white/40">
                <Clock3 className="h-3.5 w-3.5" />
                {formatUpdatedAt(recommendation.updatedAt)}
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-white/70">
              {recommendation.message}
            </p>

            {recommendation.reasons.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {recommendation.reasons.slice(0, 4).map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {recommendation.arrivalRecommendation ? (
            <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.055] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                  When to go
                </span>

                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
                  {recommendation.arrivalRecommendation.label}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-white/65">
                {recommendation.arrivalRecommendation.message}
              </p>
            </div>
          ) : null}

          <Link
            href="/spots"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm font-black text-blue-100 transition hover:bg-blue-300/15 active:scale-[0.98]"
          >
            View Venue in Spots
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5 text-center">
          <RefreshCw className="mx-auto h-5 w-5 text-white/35" />

          <p className="mt-3 text-sm leading-6 text-white/50">
            Open Spots once to load nearby venues and generate your current
            TwinMe recommendation.
          </p>

          <Link
            href="/spots"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Open Spots
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
