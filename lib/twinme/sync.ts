export type EcosystemSyncReason =
  | "none"
  | "party-active"
  | "party-prolonged"
  | "movement-drift"
  | "crew-thin"
  | "crew-separated"
  | "spots-risk"
  | "spots-safe-option"
  | "exit-active";

export type EcosystemSyncUrgency = "low" | "notice" | "elevated" | "urgent";

export type EcosystemSyncInput = {
  isPartyActive?: boolean;
  minutesActive?: number;

  movementLevel?: string | null;
  awarenessLevel?: string | null;
  driftLevel?: string | null;
  desyncLevel?: string | null;

  noSupportActive?: boolean;
  crewCollapseActive?: boolean;

  spotsSelectedName?: string | null;
  spotsRiskCount?: number;
  spotsSafeCount?: number;
  spotsNearbyCount?: number;

  exitActive?: boolean;
  exitHeadingHome?: boolean;
  exitAlone?: boolean;
};

export type EcosystemSyncEvent = {
  shouldNotify: boolean;
  reason: EcosystemSyncReason;
  urgency: EcosystemSyncUrgency;
  message: string | null;
  signalKey: string;
};

function getUrgency(input: EcosystemSyncInput): EcosystemSyncUrgency {
  if (
    input.exitActive && input.exitAlone ||
    input.crewCollapseActive ||
    input.awarenessLevel === "critical" ||
    input.desyncLevel === "separated"
  ) {
    return "urgent";
  }

  if (
    input.noSupportActive ||
    input.driftLevel === "prolonged" ||
    input.movementLevel === "high" ||
    (input.spotsRiskCount ?? 0) > 0
  ) {
    return "elevated";
  }

  if (input.isPartyActive || (input.minutesActive ?? 0) >= 20) {
    return "notice";
  }

  return "low";
}

export function getEcosystemSyncEvent(
  input: EcosystemSyncInput
): EcosystemSyncEvent {
  const urgency = getUrgency(input);

  if (input.exitActive) {
    const message = input.exitAlone
      ? "Exit is active and you appear to be leaving alone. Keep the route simple and stay reachable."
      : "Exit is active. Keep the next step clear and avoid changing plans mid-exit.";

    return {
      shouldNotify: true,
      reason: "exit-active",
      urgency,
      message,
      signalKey: `exit:${input.exitAlone ? "alone" : "supported"}`,
    };
  }

  if (input.crewCollapseActive) {
    return {
      shouldNotify: true,
      reason: "crew-thin",
      urgency,
      message:
        "Crew support looks unstable right now. Keep your next move visible and easy to reverse.",
      signalKey: "crew:collapse",
    };
  }

  if (input.desyncLevel === "separated") {
    return {
      shouldNotify: true,
      reason: "crew-separated",
      urgency,
      message:
        "You look separated from your crew. Check who is nearby before making another move.",
      signalKey: "crew:separated",
    };
  }

  if (input.noSupportActive) {
    return {
      shouldNotify: true,
      reason: "crew-thin",
      urgency,
      message:
        "Support is thin around you right now. Stay visible and avoid open-ended movement.",
      signalKey: "crew:no-support",
    };
  }

  if (input.driftLevel === "prolonged" || input.movementLevel === "high") {
    return {
      shouldNotify: true,
      reason: "movement-drift",
      urgency,
      message:
        "Your movement pattern looks elevated. Choose a destination before you keep moving.",
      signalKey: `movement:${input.driftLevel ?? "unknown"}:${input.movementLevel ?? "unknown"}`,
    };
  }

  if ((input.spotsRiskCount ?? 0) > 0) {
    return {
      shouldNotify: true,
      reason: "spots-risk",
      urgency,
      message: input.spotsSelectedName
        ? `${input.spotsSelectedName} has risk signals right now. Choose a safer, familiar, visible option.`
        : "One or more nearby spots look risky right now. Keep your next choice familiar and easy to leave from.",
      signalKey: `spots:risk:${input.spotsSelectedName ?? "unknown"}`,
    };
  }

  if ((input.spotsSafeCount ?? 0) > 0 && input.isPartyActive) {
    return {
      shouldNotify: true,
      reason: "spots-safe-option",
      urgency,
      message: input.spotsSelectedName
        ? `${input.spotsSelectedName} looks like a safer option right now. Keep it simple and intentional.`
        : "There are safer options nearby. Choose one clear destination instead of drifting.",
      signalKey: `spots:safe:${input.spotsSelectedName ?? "available"}`,
    };
  }

  if (input.isPartyActive && (input.minutesActive ?? 0) >= 45) {
    return {
      shouldNotify: true,
      reason: "party-prolonged",
      urgency,
      message:
        "You have been active for a while. Slow the next move down and check your energy before continuing.",
      signalKey: `party:prolonged:${Math.floor((input.minutesActive ?? 0) / 15)}`,
    };
  }

  if (input.isPartyActive) {
    return {
      shouldNotify: false,
      reason: "party-active",
      urgency,
      message: null,
      signalKey: "party:active",
    };
  }

  return {
    shouldNotify: false,
    reason: "none",
    urgency: "low",
    message: null,
    signalKey: "none",
  };
}