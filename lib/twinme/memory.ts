export type EmotionalState =
  | "steady"
  | "overwhelmed"
  | "uncertain"
  | "drifting"
  | "isolated"
  | "resisting"
  | "risk-seeking";

export type TwinMemoryState = {
  primaryState: EmotionalState;
  unresolvedState: EmotionalState | null;
  intensity: number;
  carryoverCount: number;
  lastUpdatedAt: number;
  lastUserText: string;
};

export type MemoryInput = {
  now: number;
  userText: string;
  previous?: TwinMemoryState | null;
};

export type MemoryResult = {
  memory: TwinMemoryState;
  shouldCarryForward: boolean;
  carryForwardMessage: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function detectEmotionalState(text: string): EmotionalState {
  const clean = text.toLowerCase();

  if (
    includesAny(clean, [
      "overwhelmed",
      "too much",
      "stressed",
      "stress",
      "panic",
      "anxious",
    ])
  ) {
    return "overwhelmed";
  }

  if (
    includesAny(clean, [
      "idk",
      "i don't know",
      "dont know",
      "not sure",
      "confused",
      "unsure",
    ])
  ) {
    return "uncertain";
  }

  if (
    includesAny(clean, [
      "walk around",
      "wander",
      "figure it out",
      "no plan",
      "see what happens",
    ])
  ) {
    return "drifting";
  }

  if (
    includesAny(clean, [
      "alone",
      "by myself",
      "go alone",
      "leave alone",
      "walk alone",
    ])
  ) {
    return "isolated";
  }

  if (
    includesAny(clean, [
      "dont want",
      "don't want",
      "something else",
      "not that",
      "no",
    ])
  ) {
    return "resisting";
  }

  if (
    includesAny(clean, [
      "somewhere new",
      "random place",
      "unfamiliar",
      "try it anyway",
      "see what happens",
    ])
  ) {
    return "risk-seeking";
  }

  return "steady";
}

function isClarityText(text: string) {
  const clean = text.toLowerCase();

  return includesAny(clean, [
    "i will",
    "i'm going to",
    "im going to",
    "i decided",
    "i choose",
    "i am going to",
    "i’ll go",
    "i'll go",
  ]);
}

function getCarryForwardMessage(
  previousState: EmotionalState,
  currentState: EmotionalState,
  carryoverCount: number
) {
  if (previousState === "overwhelmed" && currentState === "uncertain") {
    return carryoverCount > 1
      ? "This still feels connected to the overwhelm. We do not need a big answer — just one next move."
      : "That uncertainty may be coming from the overwhelm. Let’s make the next step smaller.";
  }

  if (previousState === "uncertain" && currentState === "drifting") {
    return "This sounds like uncertainty turning into movement. Pause before it becomes wandering.";
  }

  if (previousState === "overwhelmed" && currentState === "drifting") {
    return "This looks like overwhelm turning into drift. Do not move just to escape the feeling.";
  }

  if (previousState === "isolated" && currentState === "drifting") {
    return "Being alone and drifting is not a good combination. Stay visible or reconnect first.";
  }

  if (previousState === "resisting" && currentState === "risk-seeking") {
    return "This looks like resistance turning into a riskier choice. Keep control of the next move.";
  }

  return null;
}

export function updateTwinMemory(input: MemoryInput): MemoryResult {
  const now = input.now;
  const text = input.userText.trim();
  const currentState = detectEmotionalState(text);
  const previous = input.previous ?? null;

  if (!previous) {
    const memory: TwinMemoryState = {
      primaryState: currentState,
      unresolvedState: currentState === "steady" ? null : currentState,
      intensity: currentState === "steady" ? 0 : 1,
      carryoverCount: 0,
      lastUpdatedAt: now,
      lastUserText: text,
    };

    return {
      memory,
      shouldCarryForward: false,
      carryForwardMessage: null,
    };
  }

  const minutesSinceUpdate = (now - previous.lastUpdatedAt) / 60000;
  const decay = minutesSinceUpdate > 5 ? 1 : 0;

  let intensity = clamp(previous.intensity - decay, 0, 5);
  let unresolvedState = previous.unresolvedState;
  let carryoverCount = previous.carryoverCount;

  if (isClarityText(text)) {
    const memory: TwinMemoryState = {
      primaryState: "steady",
      unresolvedState: null,
      intensity: 0,
      carryoverCount: 0,
      lastUpdatedAt: now,
      lastUserText: text,
    };

    return {
      memory,
      shouldCarryForward: false,
      carryForwardMessage: null,
    };
  }

  if (currentState !== "steady") {
    intensity = clamp(intensity + 1, 0, 5);

    if (previous.primaryState !== currentState && previous.primaryState !== "steady") {
      carryoverCount += 1;
    }

    unresolvedState = currentState;
  }

  const carryForwardMessage =
    previous.primaryState !== currentState
      ? getCarryForwardMessage(previous.primaryState, currentState, carryoverCount)
      : null;

  const memory: TwinMemoryState = {
    primaryState: currentState,
    unresolvedState,
    intensity,
    carryoverCount,
    lastUpdatedAt: now,
    lastUserText: text,
  };

  return {
    memory,
    shouldCarryForward: Boolean(carryForwardMessage),
    carryForwardMessage,
  };
}

export function getInitialTwinMemory(): TwinMemoryState {
  return {
    primaryState: "steady",
    unresolvedState: null,
    intensity: 0,
    carryoverCount: 0,
    lastUpdatedAt: Date.now(),
    lastUserText: "",
  };
}