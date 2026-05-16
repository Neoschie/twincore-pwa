export type PredictiveRisk =
  | "none"
  | "hesitation"
  | "uncertainty"
  | "drift"
  | "isolation"
  | "risk-seeking"
  | "overload";

export type PredictiveUrgency = "low" | "notice" | "elevated" | "urgent";

export type PredictiveInput = {
  now: number;
  lastUserMessageAt: number;
  lastTwinMessageAt: number;

  recentUserText?: string | null;
  previousUserText?: string | null;

  awarenessLevel?: string | null;
  driftLevel?: string | null;
  desyncLevel?: string | null;
  noSupportActive?: boolean;
  crewCollapseActive?: boolean;
  isPartyActive?: boolean;

  repeatCount?: number;
  uncertaintyCount?: number;
  overwhelmCount?: number;
};

export type PredictiveResult = {
  shouldNudge: boolean;
  risk: PredictiveRisk;
  urgency: PredictiveUrgency;
  score: number;
  message: string | null;
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getUrgency(score: number): PredictiveUrgency {
  if (score >= 8) return "urgent";
  if (score >= 5) return "elevated";
  if (score >= 3) return "notice";
  return "low";
}

function getRecentText(input: PredictiveInput) {
  return (input.recentUserText || "").toLowerCase().trim();
}

function detectRisk(input: PredictiveInput): {
  risk: PredictiveRisk;
  score: number;
} {
  const text = getRecentText(input);
  let score = 0;
  let risk: PredictiveRisk = "none";

  if (input.awarenessLevel === "critical") score += 3;
  if (input.awarenessLevel === "elevated") score += 2;
  if (input.driftLevel === "prolonged") score += 3;
  if (input.desyncLevel === "separated") score += 3;
  if (input.noSupportActive) score += 3;
  if (input.crewCollapseActive) score += 4;
  if (input.isPartyActive) score += 1;

  if ((input.repeatCount ?? 0) >= 2) score += 2;
  if ((input.uncertaintyCount ?? 0) >= 2) score += 2;
  if ((input.overwhelmCount ?? 0) >= 2) score += 2;

  if (
    includesAny(text, [
      "idk",
      "i don't know",
      "dont know",
      "not sure",
      "maybe",
      "i guess",
    ])
  ) {
    score += 3;
    risk = "uncertainty";
  }

  if (
    includesAny(text, [
      "walk around",
      "wander",
      "figure it out",
      "no plan",
      "see what happens",
    ])
  ) {
    score += 4;
    risk = "drift";
  }

  if (
    includesAny(text, [
      "alone",
      "by myself",
      "go alone",
      "leave alone",
      "walk alone",
    ])
  ) {
    score += 4;
    risk = "isolation";
  }

  if (
    includesAny(text, [
      "somewhere new",
      "random place",
      "unfamiliar",
      "try it anyway",
    ])
  ) {
    score += 4;
    risk = "risk-seeking";
  }

  if (
    includesAny(text, [
      "overwhelmed",
      "too much",
      "stressed",
      "stress",
      "anxious",
      "panic",
    ])
  ) {
    score += 3;
    risk = "overload";
  }

  const timeSinceUser = input.now - input.lastUserMessageAt;
  const timeSinceTwin = input.now - input.lastTwinMessageAt;

  const recentSilenceAfterUser =
    timeSinceUser > 45 * 1000 && timeSinceTwin > 30 * 1000;

  if (recentSilenceAfterUser && risk !== "none") {
    score += 2;
    if (risk === "none") risk = "hesitation";
  }

  return { risk, score };
}

function getPredictiveMessage(
  risk: PredictiveRisk,
  urgency: PredictiveUrgency
): string | null {
  if (risk === "none") return null;

  if (risk === "uncertainty") {
    return urgency === "urgent" || urgency === "elevated"
      ? "You sound uncertain, and this could turn into drift if you keep it open-ended. Pick one small controlled move."
      : "That sounds uncertain. Keep the next step small instead of trying to solve everything.";
  }

  if (risk === "drift") {
    return urgency === "urgent" || urgency === "elevated"
      ? "This is starting to look like drift before it becomes movement. Choose a destination before you move."
      : "Before you move, choose where you are going. Open-ended movement makes this harder to control.";
  }

  if (risk === "isolation") {
    return urgency === "urgent" || urgency === "elevated"
      ? "You are moving toward isolation. Reconnect, stay visible, or choose a safer spot before you go."
      : "Before going alone, check support or stay somewhere visible.";
  }

  if (risk === "risk-seeking") {
    return urgency === "urgent" || urgency === "elevated"
      ? "A new or random place adds unpredictability right now. Keep the next move familiar, visible, and easy to leave from."
      : "Keep it familiar right now. New places add more uncertainty than you need.";
  }

  if (risk === "overload") {
    return urgency === "urgent" || urgency === "elevated"
      ? "You sound overloaded. Do not make a big decision from this state. Slow down and choose one next step."
      : "This sounds like overload. Make the next step smaller.";
  }

  if (risk === "hesitation") {
    return "You have paused after an uncertain moment. Did clarity come back, or are you stuck between choices?";
  }

  return null;
}

export function getPredictiveForecast(
  input: PredictiveInput
): PredictiveResult {
  const { risk, score } = detectRisk(input);
  const urgency = getUrgency(score);
  const message = getPredictiveMessage(risk, urgency);

  return {
    shouldNudge: Boolean(message) && score >= 3,
    risk,
    urgency,
    score,
    message,
  };
}