export type PassiveAwarenessLevel = "quiet" | "notice" | "elevated" | "urgent";

export type PassiveAwarenessInput = {
  now: number;
  lastUserMessageAt?: number | null;
  lastTwinMessageAt?: number | null;
  lastInteractionAt?: number | null;

  awarenessLevel?: string | null;
  driftLevel?: string | null;
  desyncLevel?: string | null;

  noSupportActive?: boolean;
  crewCollapseActive?: boolean;

  isPartyActive?: boolean;
  isListening?: boolean;
  isThinking?: boolean;

  recentUserText?: string;
};

export type PassiveAwarenessResult = {
  shouldIntervene: boolean;
  level: PassiveAwarenessLevel;
  reason:
    | "silence"
    | "overwhelm"
    | "isolation"
    | "drift"
    | "desync"
    | "crew-collapse"
    | "none";
  message: string | null;
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function getPassiveAwareness(
  input: PassiveAwarenessInput
): PassiveAwarenessResult {
  const now = input.now;
  const recentText = (input.recentUserText || "").toLowerCase();

  const lastInteraction =
    input.lastInteractionAt ??
    input.lastUserMessageAt ??
    input.lastTwinMessageAt ??
    null;

  const silentForMs = lastInteraction ? now - lastInteraction : 0;
  const silentForMinutes = silentForMs / 60000;

  const isCritical =
    input.awarenessLevel === "critical" ||
    input.driftLevel === "prolonged" ||
    input.desyncLevel === "separated";

  const soundsOverwhelmed = includesAny(recentText, [
    "overwhelmed",
    "too much",
    "stressed",
    "stress",
    "anxious",
    "panic",
    "i don't know",
    "idk",
  ]);

  if (input.isThinking) {
    return {
      shouldIntervene: false,
      level: "quiet",
      reason: "none",
      message: null,
    };
  }

  if (input.crewCollapseActive) {
    return {
      shouldIntervene: true,
      level: "urgent",
      reason: "crew-collapse",
      message:
        "Your crew support looks unstable right now. Keep your next move simple, visible, and easy to exit.",
    };
  }

  if (input.noSupportActive && input.isPartyActive) {
    return {
      shouldIntervene: true,
      level: "elevated",
      reason: "isolation",
      message:
        "You do not have strong support around you right now. Stay visible and avoid making your next move alone.",
    };
  }

  if (input.desyncLevel === "separated") {
    return {
      shouldIntervene: true,
      level: "elevated",
      reason: "desync",
      message:
        "You seem out of sync with your crew. Before moving, check who is actually nearby and reachable.",
    };
  }

  if (input.driftLevel === "prolonged") {
    return {
      shouldIntervene: true,
      level: "elevated",
      reason: "drift",
      message:
        "You have been drifting for a while. Pick one controlled next step instead of trying to solve everything at once.",
    };
  }

  if (soundsOverwhelmed && silentForMinutes >= 1) {
    return {
      shouldIntervene: true,
      level: isCritical ? "urgent" : "notice",
      reason: "overwhelm",
      message:
        "You sounded overwhelmed, then went quiet. Let’s make this smaller: breathe, pause, and choose one next move.",
    };
  }

  if (silentForMinutes >= 4 && input.isPartyActive) {
    return {
      shouldIntervene: true,
      level: isCritical ? "elevated" : "notice",
      reason: "silence",
      message:
        "You have gone quiet for a bit. Did something shift, or are you just taking a moment?",
    };
  }

  return {
    shouldIntervene: false,
    level: "quiet",
    reason: "none",
    message: null,
  };
}