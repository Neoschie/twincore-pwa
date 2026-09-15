export type TwinOrbDialogueEvent =
  | "ambient_presence"
  | "listening_started"
  | "thinking_started"
  | "speaking_started"
  | "guardian_warning"
  | "memory_recalled"
  | "conversation_opened"
  | "conversation_closed"
  | "recovery"
  | "settling"
  | "reconnected";

export type TwinOrbDialoguePriority =
  | "ambient"
  | "normal"
  | "important"
  | "urgent";

export type TwinOrbDialogueContext = {
  displayName?: string | null;
  latestTwinText?: string | null;
  ambientText?: string | null;
  awarenessLevel?: "low" | "guarded" | "elevated" | "critical";
  trajectoryRiskWindow?: "none" | "approaching" | "imminent";
  lastDialogue?: string | null;
  seed?: string | number | null;
};

export type TwinOrbDialogueResult = {
  event: TwinOrbDialogueEvent;
  line: string | null;
  secondaryLine: string | null;
  priority: TwinOrbDialoguePriority;

  interruptAmbient: boolean;
  persistUntilStateChange: boolean;
  autoClearMs: number | null;

  voiceEligible: boolean;
};

const DIALOGUE: Record<TwinOrbDialogueEvent, string[]> = {
  ambient_presence: [
    "I'm here.",
    "I'm staying close.",
    "I'm with you.",
    "No rush.",
  ],

  listening_started: [
    "I'm listening.",
    "Go ahead.",
    "I'm with you.",
    "Tell me.",
  ],

  thinking_started: [
    "Connecting the pieces.",
    "I'm working through it.",
    "Give me a moment.",
    "I'm looking at the whole picture.",
  ],

  speaking_started: [],

  guardian_warning: [
    "Pause. Stay with me.",
    "Let's slow this down.",
    "One step at a time.",
    "Something needs your attention.",
  ],

  memory_recalled: [
    "I remember this.",
    "We've been here before.",
    "Something familiar surfaced.",
    "I'm connecting this with what I remember.",
  ],

  conversation_opened: [
    "I'm here. Let's go deeper.",
    "Tell me what's on your mind.",
    "We can take our time.",
  ],

  conversation_closed: [
    "I'm still here.",
    "I'll stay close.",
    "We can leave it here for now.",
  ],

  recovery: [
    "You're coming back.",
    "You're settling.",
    "Keep it simple.",
    "Stay with this pace.",
  ],

  settling: [
    "That's better.",
    "Stay here for a moment.",
    "No need to rush.",
    "Keep this pace.",
  ],

  reconnected: [
    "Welcome back.",
    "I'm here.",
    "We're connected again.",
  ],
};

function clean(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function hashSeed(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function chooseLine(
  event: TwinOrbDialogueEvent,
  context: TwinOrbDialogueContext,
): string | null {
  /*
   * If the brain already produced meaningful language,
   * preserve it for speaking / guardian / memory moments
   * instead of replacing intelligence with canned copy.
   */
  const brainText = clean(context.latestTwinText);

  if (
    brainText &&
    (
      event === "speaking_started" ||
      event === "guardian_warning" ||
      event === "memory_recalled" ||
      event === "recovery"
    )
  ) {
    return brainText;
  }

  if (event === "ambient_presence") {
    const ambient = clean(context.ambientText);

    if (ambient) {
      return ambient;
    }
  }

  const options = DIALOGUE[event];

  if (!options.length) {
    return brainText;
  }

  const lastDialogue = clean(context.lastDialogue);

  const available =
    options.length > 1 && lastDialogue
      ? options.filter((line) => line !== lastDialogue)
      : options;

  const pool = available.length ? available : options;

  /*
   * Stable selection instead of Math.random().
   * TwinMe should feel intentional, not like a slot machine.
   */
  const seedSource = [
    event,
    context.seed ?? "",
    context.displayName ?? "",
    context.awarenessLevel ?? "",
    context.trajectoryRiskWindow ?? "",
  ].join("|");

  const index = hashSeed(seedSource) % pool.length;

  return pool[index] ?? null;
}

function getPriority(
  event: TwinOrbDialogueEvent,
  context: TwinOrbDialogueContext,
): TwinOrbDialoguePriority {
  if (
    event === "guardian_warning" ||
    context.awarenessLevel === "critical" ||
    context.trajectoryRiskWindow === "imminent"
  ) {
    return "urgent";
  }

  if (
    event === "memory_recalled" ||
    context.awarenessLevel === "elevated" ||
    context.trajectoryRiskWindow === "approaching"
  ) {
    return "important";
  }

  if (event === "ambient_presence") {
    return "ambient";
  }

  return "normal";
}

function getAutoClearMs(
  event: TwinOrbDialogueEvent,
): number | null {
  switch (event) {
    case "ambient_presence":
      return 7000;

    case "listening_started":
      return null;

    case "thinking_started":
      return null;

    case "speaking_started":
      return null;

    case "guardian_warning":
      return null;

    case "memory_recalled":
      return 9000;

    case "conversation_opened":
      return 5000;

    case "conversation_closed":
      return 4500;

    case "recovery":
      return 7500;

    case "settling":
      return 6500;

    case "reconnected":
      return 5000;

    default:
      return 6000;
  }
}

function getSecondaryLine(
  event: TwinOrbDialogueEvent,
): string | null {
  switch (event) {
    case "thinking_started":
      return "TwinMe is connecting context.";

    case "listening_started":
      return "Speak naturally.";

    case "guardian_warning":
      return "Your safety has priority.";

    case "memory_recalled":
      return "Connecting this moment with what I know.";

    default:
      return null;
  }
}

export function getTwinOrbDialogue(
  event: TwinOrbDialogueEvent,
  context: TwinOrbDialogueContext = {},
): TwinOrbDialogueResult {
  const priority = getPriority(event, context);

  return {
    event,

    line: chooseLine(event, context),

    secondaryLine: getSecondaryLine(event),

    priority,

    interruptAmbient:
      priority === "urgent" ||
      priority === "important" ||
      event === "listening_started" ||
      event === "thinking_started" ||
      event === "speaking_started",

    persistUntilStateChange:
      event === "listening_started" ||
      event === "thinking_started" ||
      event === "speaking_started" ||
      event === "guardian_warning",

    autoClearMs: getAutoClearMs(event),

    voiceEligible:
      event !== "thinking_started" &&
      event !== "conversation_opened" &&
      event !== "conversation_closed",
  };
}
