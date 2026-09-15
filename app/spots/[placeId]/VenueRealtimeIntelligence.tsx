"use client";

import { useMemo, useState } from "react";
import VenueLiveReports, {
  type VenueLiveReport,
} from "./VenueLiveReports";

type VenueRealtimeIntelligenceProps = {
  venueName: string;
};

function getCrowdScore(crowdLevel: string | null) {
  switch (crowdLevel?.trim().toLowerCase()) {
    case "low":
      return 20;

    case "moderate":
      return 45;

    case "busy":
      return 72;

    case "packed":
      return 95;

    default:
      return 15;
  }
}

export default function VenueRealtimeIntelligence({
  venueName,
}: VenueRealtimeIntelligenceProps) {
  const [reports, setReports] = useState<VenueLiveReport[]>([]);

const crowdIntelligence = useMemo(() => {
  if (reports.length === 0) {
    return {
      occupancyPercent: 15,
      occupancyLabel: "Quiet",
      momentum: "Stable",
      momentumNote: "No live surge",
      crowdTrend: "Steady",
      trendNote: "Awaiting reports",
    };
  }

  const sortedReports = [...reports].sort(
    (firstReport, secondReport) =>
      new Date(secondReport.created_at).getTime() -
      new Date(firstReport.created_at).getTime(),
  );

  const scores = sortedReports.map((report) =>
    getCrowdScore(report.crowd_level),
  );

  const occupancyPercent = Math.round(
    scores.reduce((total, score) => total + score, 0) /
      scores.length,
  );

  const newestScore = scores[0] ?? occupancyPercent;
  const oldestScore =
    scores[scores.length - 1] ?? occupancyPercent;

  const scoreDifference = newestScore - oldestScore;

  const crowdTrend =
    scoreDifference >= 15
      ? "Rising"
      : scoreDifference <= -15
        ? "Falling"
        : "Steady";

  const momentum =
    occupancyPercent >= 85
      ? "Peak"
      : crowdTrend === "Rising"
        ? "Building"
        : crowdTrend === "Falling"
          ? "Cooling"
          : "Stable";

  const occupancyLabel =
    occupancyPercent >= 85
      ? "Packed"
      : occupancyPercent >= 65
        ? "Busy"
        : occupancyPercent >= 35
          ? "Moderate"
          : "Quiet";

  const momentumNote =
    momentum === "Peak"
      ? "High activity"
      : momentum === "Building"
        ? "Activity increasing"
        : momentum === "Cooling"
          ? "Activity easing"
          : "No major surge";

  const trendNote =
    reports.length >= 2
      ? "Based on recent reports"
      : "One live report";

  return {
    occupancyPercent,
    occupancyLabel,
    momentum,
    momentumNote,
    crowdTrend,
    trendNote,
  };
}, [reports]);

const twinMePrediction = useMemo(() => {
  const freshReports = reports.filter((report) => {
    const reportTime = new Date(report.created_at).getTime();
    const ageMinutes = (Date.now() - reportTime) / 60000;

    return ageMinutes <= 60;
  });

  const trustedReportCount = reports.filter(
    (report) => report.trusted,
  ).length;

  const confidence = Math.min(
    95,
    55 +
      freshReports.length * 8 +
      trustedReportCount * 5,
  );

  if (reports.length === 0) {
    return {
      title: "Steady conditions",
      message:
        "No live reports are available yet. TwinMe is using a low-activity baseline.",
      confidence: 55,
      tone:
        "border-cyan-300/20 bg-cyan-300/[0.06]",
      badge:
        "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
      label: "Stable",
    };
  }

  if (crowdIntelligence.momentum === "Peak") {
    return {
      title: "Peak activity",
      message:
        "This venue is currently very busy. Expect higher energy, longer waits, and limited space.",
      confidence,
      tone:
        "border-red-300/20 bg-red-300/[0.06]",
      badge:
        "border-red-300/20 bg-red-300/10 text-red-100",
      label: "Peak",
    };
  }

  if (crowdIntelligence.momentum === "Building") {
    return {
      title: "Getting busier",
      message:
        "Recent reports suggest activity is increasing. Arriving soon may help you avoid the busiest period.",
      confidence,
      tone:
        "border-orange-300/20 bg-orange-300/[0.06]",
      badge:
        "border-orange-300/20 bg-orange-300/10 text-orange-100",
      label: "Rising",
    };
  }

  if (crowdIntelligence.momentum === "Cooling") {
    return {
      title: "Calming down",
      message:
        "Crowd levels appear to be easing. This may be a better time to visit if you prefer a quieter experience.",
      confidence,
      tone:
        "border-sky-300/20 bg-sky-300/[0.06]",
      badge:
        "border-sky-300/20 bg-sky-300/10 text-sky-100",
      label: "Cooling",
    };
  }

  return {
    title: "Steady conditions",
    message:
      "Activity appears stable with no major crowd surge detected right now.",
    confidence,
    tone:
      "border-cyan-300/20 bg-cyan-300/[0.06]",
    badge:
      "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    label: "Stable",
  };
}, [crowdIntelligence, reports]);

const heatScore = useMemo(() => {
  let score = crowdIntelligence.occupancyPercent;

  if (crowdIntelligence.momentum === "Peak") {
    score += 20;
  } else if (crowdIntelligence.momentum === "Building") {
    score += 10;
  } else if (crowdIntelligence.momentum === "Cooling") {
    score -= 8;
  }

  const trustedReports = reports.filter(
    (report) => report.trusted,
  ).length;

  score += trustedReports * 3;

  const freshReports = reports.filter((report) => {
    const ageMinutes =
      (Date.now() - new Date(report.created_at).getTime()) /
      60000;

    return ageMinutes <= 30;
  }).length;

  score += freshReports * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}, [crowdIntelligence, reports]);

  return (
    <>
      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
              
              <section
  className={`mt-5 rounded-3xl border p-5 shadow-[0_0_40px_rgba(34,211,238,0.08)] ${twinMePrediction.tone}`}
>
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">
        TwinMe Prediction
      </div>

      <h2 className="mt-2 text-xl font-black text-white">
        {twinMePrediction.title}
      </h2>
    </div>

    <div className="flex flex-col items-end gap-2">
  <span
    className={`rounded-full border px-3 py-1 text-xs font-bold ${twinMePrediction.badge}`}
  >
    {twinMePrediction.confidence}% confidence
  </span>

  <span
    className={`rounded-full border px-3 py-1 text-xs font-black ${
      heatScore >= 85
        ? "border-red-300/20 bg-red-300/10 text-red-100"
        : heatScore >= 65
          ? "border-orange-300/20 bg-orange-300/10 text-orange-100"
          : heatScore >= 35
            ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
            : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
    }`}
  >
    🔥 {heatScore >= 85
      ? "Very busy"
      : heatScore >= 65
        ? "Busy"
        : heatScore >= 35
          ? "Moderate"
          : "Quiet"}
  </span>
</div>
  </div>

  <p className="mt-3 text-sm leading-6 text-white/65">
    {twinMePrediction.message}
  </p>

  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="flex items-center justify-between text-xs text-white/50">
      <span>Current outlook</span>
      <span>{twinMePrediction.label}</span>
    </div>

    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-cyan-300 transition-all duration-700"
        style={{
          width: `${twinMePrediction.confidence}%`,
        }}
      />
    </div>
  </div>
</section>

              Live Activity
            </div>

            <h2 className="mt-2 text-xl font-black text-white">
              Crowd snapshot
            </h2>
          </div>

          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
            {reports.length} live
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="text-xs text-white/45">
      Occupancy
    </div>

    <div className="mt-2 text-2xl font-black text-white">
      {crowdIntelligence.occupancyLabel}
    </div>

    <div className="mt-1 text-xs text-cyan-200">
      {crowdIntelligence.occupancyLabel}
    </div>
  </div>

  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="text-xs text-white/45">
      Momentum
    </div>

    <div className="mt-2 text-2xl font-black text-white">
      {crowdIntelligence.momentum}
    </div>

    <div className="mt-1 text-xs text-white/50">
      {crowdIntelligence.momentumNote}
    </div>
  </div>

  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="text-xs text-white/45">
      Crowd trend
    </div>

    <div className="mt-2 text-2xl font-black text-white">
      {crowdIntelligence.crowdTrend}
    </div>

    <div className="mt-1 text-xs text-white/50">
      {crowdIntelligence.trendNote}
    </div>
  </div>
</div>

<div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
  <div className="flex items-center justify-between text-xs text-white/50">
    <span>Quiet</span>
    <span>Moderate</span>
    <span>Busy</span>
    <span>Packed</span>
  </div>

  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
    <div
      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300 transition-all duration-700"
      style={{
        width:
          crowdIntelligence.occupancyLabel === "Packed"
            ? "100%"
            : crowdIntelligence.occupancyLabel === "Busy"
              ? "75%"
              : crowdIntelligence.occupancyLabel === "Moderate"
                ? "50%"
                : "25%",
      }}
    />
  </div>
</div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
              Live Reports
            </div>

            <h2 className="mt-2 text-xl font-black text-white">
              Recent activity
            </h2>
          </div>

          <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-bold text-orange-100">
            {reports.length}{" "}
            {reports.length === 1 ? "report" : "reports"}
          </span>
        </div>

        <div className="mt-5">
          <VenueLiveReports
            venueName={venueName}
            onReportsChange={setReports}
          />
        </div>
      </section>
    </>
  );
}