"use client";

type PartyMomentum =
  | "Peak"
  | "Building"
  | "Cooling"
  | "Stable"
  | "Standby";

type OrbScoreProps = {
  score: number;
  label: string;
  momentum: PartyMomentum;
};

function getMomentumLabel(momentum: PartyMomentum) {
  if (momentum === "Peak") return "🔥 Peak";
  if (momentum === "Building") return "↗ Building";
  if (momentum === "Cooling") return "↘ Cooling";
  if (momentum === "Stable") return "→ Stable";
  return "Standby";
}

export default function OrbScore({
  score,
  label,
  momentum,
}: OrbScoreProps) {
  return (
    <div className="tc-orb__core">
      <span className="tc-orb__eyebrow">Live Energy</span>

      <strong>{score}</strong>

      <span className="tc-orb__label">{label}</span>

      <span className="tc-orb__momentum">
        {getMomentumLabel(momentum)}
      </span>
    </div>
  );
}
