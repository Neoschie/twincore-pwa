"use client";

import {
  Activity,
  LocateFixed,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type PartyMomentum =
  | "Peak"
  | "Building"
  | "Cooling"
  | "Stable"
  | "Standby";

type Props = {
  score: number;
  momentum: PartyMomentum;
  autoTracking: boolean;
  partyActive: boolean;
  side: "left" | "right";
};

function Waveform({
  tone,
  seed,
}: {
  tone: "pink" | "cyan" | "green" | "orange";
  seed: number;
}) {
  const stroke =
    tone === "pink"
      ? "#f04bff"
      : tone === "cyan"
        ? "#19c9ff"
        : tone === "green"
          ? "#1df28a"
          : "#ff8c24";

  const points = Array.from({ length: 26 }, (_, index) => {
    const x = index * 4;
    const y = 14 + Math.sin((index + seed) * 0.82) * (5 + ((index * 7) % 4));
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      className="h-8 w-24 overflow-visible"
      viewBox="0 0 100 28"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tc-vital-wave"
        style={{ "--wave-delay": `${seed * -130}ms` } as React.CSSProperties}
      />
    </svg>
  );
}

export default function LiveVitals({
  score,
  momentum,
  autoTracking,
  partyActive,
  side,
}: Props) {
  const cards =
    side === "left"
      ? [
          {
            icon: Users,
            label: "Crowd Level",
            value: score >= 80 ? "High" : score >= 55 ? "Medium" : "Low",
            tone: "pink" as const,
            seed: 2,
          },
          {
            icon: Activity,
            label: "Movement",
            value: momentum,
            tone: "orange" as const,
            seed: 5,
          },
        ]
      : [
          {
            icon: LocateFixed,
            label: "Tracking",
            value: autoTracking ? "Live" : "Off",
            tone: "cyan" as const,
            seed: 8,
          },
          {
            icon: ShieldCheck,
            label: "Protection",
            value: partyActive ? "Active" : "Standby",
            tone: "green" as const,
            seed: 11,
          },
        ];

  return (
    <div className="grid gap-3">
      {cards.map(({ icon: Icon, label, value, tone, seed }) => (
        <article
          key={label}
          className="tc-vital-card rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/70">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <Sparkles className="h-3.5 w-3.5 text-white/25" />
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-base text-white">{value}</strong>
            <Waveform tone={tone} seed={seed} />
          </div>
        </article>
      ))}
    </div>
  );
}
