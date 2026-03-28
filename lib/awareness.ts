export type AwarenessMode =
  | "balanced"
  | "elevated"
  | "caution"
  | "critical";

type Signals = {
  partyStatus: string | null;
  locationOn: boolean;
  hour: number;
};

export function getAwarenessMode(signals: Signals): AwarenessMode {
  const isLate = signals.hour >= 23 || signals.hour < 5;
  const isParty =
    signals.partyStatus === "Drinking" ||
    signals.partyStatus === "At club";

  const isHelp = signals.partyStatus === "need-help";

  if (isHelp) return "critical";

  if (isLate && !signals.locationOn) return "caution";

  if (isParty) return "elevated";

  return "balanced";
}

export function getAwarenessMessage(mode: AwarenessMode): string {
  switch (mode) {
    case "critical":
      return "High-risk signal detected. Focus on safety and connection.";

    case "caution":
      return "Late night with low visibility. Stay intentional.";

    case "elevated":
      return "Energy is high. Stay aware and grounded.";

    default:
      return "System stable. Stay connected.";
  }
}