export type AutonomyUrgency = "low" | "notice" | "elevated" | "urgent";

export type AutonomyInput = {
  now: number;

  lastUserMessageAt: number;
  lastTwinMessageAt: number;
  lastPassiveInterventionAt: number;

  isThinking: boolean;
  isListening: boolean;
  handsFreeEnabled: boolean;

  awarenessLevel?: string | null;
  driftLevel?: string | null;
  desyncLevel?: string | null;
  noSupportActive?: boolean;
  crewCollapseActive?: boolean;
  isPartyActive?: boolean;

  repeatCount?: number;
  recentReason?: string | null;
};

export type AutonomyDecision = {
  shouldIntervene: boolean;
  urgency: AutonomyUrgency;
  cooldownMs: number;
  reason:
    | "thinking"
    | "too-soon-after-user"
    | "too-soon-after-twin"
    | "cooldown"
    | "low-signal"
    | "allowed";
};

function getUrgency(input: AutonomyInput): AutonomyUrgency {
  if (
    input.crewCollapseActive ||
    input.awarenessLevel === "critical" ||
    input.desyncLevel === "separated"
  ) {
    return "urgent";
  }

  if (
    input.noSupportActive ||
    input.driftLevel === "prolonged" ||
    (input.repeatCount ?? 0) >= 2
  ) {
    return "elevated";
  }

  if (input.awarenessLevel === "elevated" || (input.repeatCount ?? 0) >= 1) {
    return "notice";
  }

  return "low";
}

function getCooldownMs(urgency: AutonomyUrgency) {
  if (urgency === "urgent") return 45 * 1000;
  if (urgency === "elevated") return 90 * 1000;
  if (urgency === "notice") return 2 * 60 * 1000;
  return 4 * 60 * 1000;
}

function getQuietAfterUserMs(urgency: AutonomyUrgency) {
  if (urgency === "urgent") return 6 * 1000;
  if (urgency === "elevated") return 10 * 1000;
  if (urgency === "notice") return 20 * 1000;
  return 45 * 1000;
}

function getQuietAfterTwinMs(urgency: AutonomyUrgency) {
  if (urgency === "urgent") return 8 * 1000;
  if (urgency === "elevated") return 15 * 1000;
  if (urgency === "notice") return 25 * 1000;
  return 60 * 1000;
}

function hasMeaningfulSignal(input: AutonomyInput) {
  return (
    input.isPartyActive ||
    input.awarenessLevel === "elevated" ||
    input.awarenessLevel === "critical" ||
    input.driftLevel === "prolonged" ||
    input.desyncLevel === "separated" ||
    input.noSupportActive === true ||
    input.crewCollapseActive === true ||
    (input.repeatCount ?? 0) > 0
  );
}

export function decideAutonomousIntervention(
  input: AutonomyInput
): AutonomyDecision {
  const urgency = getUrgency(input);
  const cooldownMs = getCooldownMs(urgency);

  if (input.isThinking) {
    return {
      shouldIntervene: false,
      urgency,
      cooldownMs,
      reason: "thinking",
    };
  }

  if (!hasMeaningfulSignal(input)) {
    return {
      shouldIntervene: false,
      urgency,
      cooldownMs,
      reason: "low-signal",
    };
  }

  const timeSinceUser = input.now - input.lastUserMessageAt;
  const timeSinceTwin = input.now - input.lastTwinMessageAt;
  const timeSincePassive = input.now - input.lastPassiveInterventionAt;

  if (timeSinceUser < getQuietAfterUserMs(urgency)) {
    return {
      shouldIntervene: false,
      urgency,
      cooldownMs,
      reason: "too-soon-after-user",
    };
  }

  if (timeSinceTwin < getQuietAfterTwinMs(urgency)) {
    return {
      shouldIntervene: false,
      urgency,
      cooldownMs,
      reason: "too-soon-after-twin",
    };
  }

  if (timeSincePassive < cooldownMs) {
    return {
      shouldIntervene: false,
      urgency,
      cooldownMs,
      reason: "cooldown",
    };
  }

  return {
    shouldIntervene: true,
    urgency,
    cooldownMs,
    reason: "allowed",
  };
}