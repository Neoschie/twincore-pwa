export type InterventionReason =
  | "drift"
  | "overwhelm"
  | "isolation"
  | "desync"
  | "crew-collapse"
  | "loop"
  | "risk"
  | "none";

export type InterventionTone = "soft" | "clear" | "direct" | "protective";

export type InterventionInput = {
  reason: InterventionReason;
  baseMessage: string;
  repeatCount: number;
  awarenessLevel?: string | null;
  driftLevel?: string | null;
  desyncLevel?: string | null;
  noSupportActive?: boolean;
  isPartyActive?: boolean;
};

export type InterventionResult = {
  message: string;
  tone: InterventionTone;
  shouldEscalate: boolean;
};

function isHighRisk(input: InterventionInput) {
  return (
    input.awarenessLevel === "critical" ||
    input.driftLevel === "prolonged" ||
    input.desyncLevel === "separated" ||
    input.noSupportActive === true
  );
}

function getTone(input: InterventionInput): InterventionTone {
  if (isHighRisk(input)) return "protective";
  if (input.repeatCount >= 3) return "direct";
  if (input.repeatCount >= 1) return "clear";
  return "soft";
}

function shapeDriftMessage(input: InterventionInput): string {
  if (input.repeatCount <= 0) {
    return input.baseMessage;
  }

  if (input.repeatCount === 1) {
    return "You already know wandering is the risk here. Pick one controlled place before you move.";
  }

  if (input.repeatCount === 2) {
    return "You’re looping now. Stop trying to think your way out of uncertainty and choose one stable move.";
  }

  return "No more circling. Choose one: stay where you are, open Spots, or move to a familiar visible place.";
}

function shapeOverwhelmMessage(input: InterventionInput): string {
  if (input.repeatCount <= 0) {
    return input.baseMessage;
  }

  if (input.repeatCount === 1) {
    return "You’re still overloaded. Do not solve the whole night right now. Choose the next small step only.";
  }

  if (input.repeatCount === 2) {
    return "This is becoming a loop. Pause, breathe, and name one thing you can control right now.";
  }

  return "Keep it simple: breathe, stay visible, and choose one next move. Nothing bigger than that.";
}

function shapeIsolationMessage(input: InterventionInput): string {
  if (input.repeatCount <= 0) {
    return input.baseMessage;
  }

  if (input.repeatCount === 1) {
    return "Support is still thin. Do not add more risk by moving alone without a clear destination.";
  }

  if (input.repeatCount === 2) {
    return "You need connection before movement. Check Crew or stay somewhere visible.";
  }

  return "Do not move alone into uncertainty. Check Crew, open Spots, or start Exit.";
}

function shapeDesyncMessage(input: InterventionInput): string {
  if (input.repeatCount <= 0) {
    return input.baseMessage;
  }

  if (input.repeatCount === 1) {
    return "You are still out of sync. Before you make another move, confirm who is actually nearby.";
  }

  if (input.repeatCount === 2) {
    return "This is not the time to guess where people are. Check Crew first.";
  }

  return "Stop guessing. Check Crew or stay visible until support is clear.";
}

function shapeCrewCollapseMessage(input: InterventionInput): string {
  if (input.repeatCount <= 0) {
    return input.baseMessage;
  }

  if (input.repeatCount === 1) {
    return "Crew support still looks unstable. Keep your choices simple and avoid splitting off further.";
  }

  if (input.repeatCount === 2) {
    return "Your safest move is clarity: check Crew, choose a visible spot, or start Exit.";
  }

  return "Treat this as unstable support. Do not drift. Check Crew or start Exit.";
}

function shapeRiskMessage(input: InterventionInput): string {
  if (input.repeatCount <= 0) {
    return input.baseMessage;
  }

  if (input.repeatCount === 1) {
    return "You are adding risk by keeping this open-ended. Choose the controlled option now.";
  }

  if (input.repeatCount === 2) {
    return "This is the point where uncertainty turns into risk. Slow down and choose the safer lane.";
  }

  return "No more open-ended movement. Choose: stay visible, check Crew, open Spots, or start Exit.";
}

export function shapeIntervention(input: InterventionInput): InterventionResult {
  const tone = getTone(input);

  let message = input.baseMessage;

  if (input.reason === "drift") {
    message = shapeDriftMessage(input);
  }

  if (input.reason === "overwhelm") {
    message = shapeOverwhelmMessage(input);
  }

  if (input.reason === "isolation") {
    message = shapeIsolationMessage(input);
  }

  if (input.reason === "desync") {
    message = shapeDesyncMessage(input);
  }

  if (input.reason === "crew-collapse") {
    message = shapeCrewCollapseMessage(input);
  }

  if (input.reason === "risk" || input.reason === "loop") {
    message = shapeRiskMessage(input);
  }

  return {
    message,
    tone,
    shouldEscalate: input.repeatCount >= 1 || isHighRisk(input),
  };
}