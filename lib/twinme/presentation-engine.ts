export type TwinPresentationState =
  | "ambient"
  | "listening"
  | "thinking"
  | "speaking"
  | "conversation"
  | "guardian"
  | "memory";

export type TwinEmotion =
  | "calm"
  | "focused"
  | "warm"
  | "reflective"
  | "concerned"
  | "protective"
  | "energized";

export type TwinOrbMode =
  | "idle"
  | "listen"
  | "think"
  | "speak"
  | "expand"
  | "guard"
  | "remember";

export type TwinPresentationInput = {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  conversationOpen?: boolean;
  memoryMoment?: boolean;

  awarenessLevel?: "low" | "guarded" | "elevated" | "critical";
  trajectoryRiskWindow?: "none" | "approaching" | "imminent";

  emotionalState?: string | null;
  voiceState?: "calm" | "reflective" | "direct" | "protective" | null;
};

export type TwinOrbAnimation = {
  pulseSeconds: number;
  scaleMin: number;
  scaleMax: number;
  particleIntensity: "off" | "low" | "medium" | "high";
  motion: "breath" | "listen" | "gather" | "speak" | "expand" | "guard" | "memory";
};

export type TwinOrbGlow = {
  primary: "cyan" | "blue" | "fuchsia" | "amber" | "red";
  secondary: "cyan" | "blue" | "fuchsia" | "amber" | "red";
  intensity: number;
};

export type TwinPresentationResult = {
  state: TwinPresentationState;
  emotion: TwinEmotion;
  orbMode: TwinOrbMode;
  animation: TwinOrbAnimation;
  glow: TwinOrbGlow;
  voiceStyle: "soft" | "balanced" | "direct" | "protective";
  shouldExpandConversation: boolean;
  shouldShowAmbientText: boolean;
};

function getPresentationState(
  input: TwinPresentationInput,
): TwinPresentationState {
  if (
    input.awarenessLevel === "critical" ||
    input.trajectoryRiskWindow === "imminent"
  ) {
    return "guardian";
  }

  if (input.conversationOpen) {
    return "conversation";
  }

  if (input.isSpeaking) {
    return "speaking";
  }

  if (input.isThinking) {
    return "thinking";
  }

  if (input.isListening) {
    return "listening";
  }

  if (input.memoryMoment) {
    return "memory";
  }

  return "ambient";
}

function getEmotion(
  input: TwinPresentationInput,
  state: TwinPresentationState,
): TwinEmotion {
  if (state === "guardian") return "protective";

  if (
    input.awarenessLevel === "elevated" ||
    input.trajectoryRiskWindow === "approaching"
  ) {
    return "concerned";
  }

  if (
    input.emotionalState === "reflective" ||
    input.voiceState === "reflective"
  ) {
    return "reflective";
  }

  if (
    input.emotionalState === "grounded" ||
    input.voiceState === "calm"
  ) {
    return "calm";
  }

  if (input.voiceState === "direct") {
    return "focused";
  }

  if (
    input.emotionalState === "positive" ||
    input.emotionalState === "energized"
  ) {
    return "energized";
  }

  return "warm";
}

function getOrbMode(state: TwinPresentationState): TwinOrbMode {
  switch (state) {
    case "listening":
      return "listen";
    case "thinking":
      return "think";
    case "speaking":
      return "speak";
    case "conversation":
      return "expand";
    case "guardian":
      return "guard";
    case "memory":
      return "remember";
    default:
      return "idle";
  }
}

function getOrbAnimation(
  state: TwinPresentationState,
): TwinOrbAnimation {
  switch (state) {
    case "listening":
      return {
        pulseSeconds: 2.6,
        scaleMin: 0.985,
        scaleMax: 1.045,
        particleIntensity: "medium",
        motion: "listen",
      };

    case "thinking":
      return {
        pulseSeconds: 1.9,
        scaleMin: 0.99,
        scaleMax: 1.055,
        particleIntensity: "high",
        motion: "gather",
      };

    case "speaking":
      return {
        pulseSeconds: 1.35,
        scaleMin: 0.99,
        scaleMax: 1.035,
        particleIntensity: "medium",
        motion: "speak",
      };

    case "conversation":
      return {
        pulseSeconds: 5.5,
        scaleMin: 0.995,
        scaleMax: 1.02,
        particleIntensity: "low",
        motion: "expand",
      };

    case "guardian":
      return {
        pulseSeconds: 1.15,
        scaleMin: 0.985,
        scaleMax: 1.06,
        particleIntensity: "high",
        motion: "guard",
      };

    case "memory":
      return {
        pulseSeconds: 6.5,
        scaleMin: 0.99,
        scaleMax: 1.025,
        particleIntensity: "medium",
        motion: "memory",
      };

    default:
      return {
        pulseSeconds: 9,
        scaleMin: 0.992,
        scaleMax: 1.018,
        particleIntensity: "low",
        motion: "breath",
      };
  }
}

function getOrbGlow(
  state: TwinPresentationState,
  emotion: TwinEmotion,
): TwinOrbGlow {
  if (state === "guardian") {
    return {
      primary: "amber",
      secondary: "red",
      intensity: 1,
    };
  }

  if (state === "thinking") {
    return {
      primary: "fuchsia",
      secondary: "cyan",
      intensity: 0.9,
    };
  }

  if (state === "listening") {
    return {
      primary: "cyan",
      secondary: "blue",
      intensity: 0.82,
    };
  }

  if (state === "speaking") {
    return {
      primary: "cyan",
      secondary: "fuchsia",
      intensity: 0.88,
    };
  }

  if (state === "memory") {
    return {
      primary: "blue",
      secondary: "fuchsia",
      intensity: 0.74,
    };
  }

  if (emotion === "concerned") {
    return {
      primary: "fuchsia",
      secondary: "amber",
      intensity: 0.72,
    };
  }

  if (emotion === "energized") {
    return {
      primary: "cyan",
      secondary: "fuchsia",
      intensity: 0.86,
    };
  }

  return {
    primary: "cyan",
    secondary: "fuchsia",
    intensity: 0.66,
  };
}

function getVoiceStyle(
  state: TwinPresentationState,
  input: TwinPresentationInput,
): TwinPresentationResult["voiceStyle"] {
  if (state === "guardian") return "protective";

  if (input.voiceState === "protective") return "protective";
  if (input.voiceState === "direct") return "direct";
  if (input.voiceState === "reflective") return "soft";

  return "balanced";
}

function shouldExpandConversation(
  state: TwinPresentationState,
): boolean {
  return state === "conversation";
}

function shouldShowAmbientText(
  state: TwinPresentationState,
): boolean {
  return (
    state === "ambient" ||
    state === "thinking" ||
    state === "speaking" ||
    state === "memory" ||
    state === "guardian"
  );
}

export function getTwinPresentation(
  input: TwinPresentationInput,
): TwinPresentationResult {
  const state = getPresentationState(input);
  const emotion = getEmotion(input, state);
  const orbMode = getOrbMode(state);
  const animation = getOrbAnimation(state);
  const glow = getOrbGlow(state, emotion);
  const voiceStyle = getVoiceStyle(state, input);

  return {
    state,
    emotion,
    orbMode,
    animation,
    glow,
    voiceStyle,
    shouldExpandConversation: shouldExpandConversation(state),
    shouldShowAmbientText: shouldShowAmbientText(state),
  };
}
