import {
  getTwinPresentation,
  type TwinPresentationResult,
} from "./presentation-engine";

export type TwinAwarenessLevel =
  | "low"
  | "guarded"
  | "elevated"
  | "critical";

export type TwinTrajectoryRiskWindow =
  | "none"
  | "approaching"
  | "imminent";

export type TwinControllerVoiceState =
  | "calm"
  | "reflective"
  | "direct"
  | "protective";

export type TwinPresentationControllerInput = {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  conversationOpen: boolean;
  memoryMoment?: boolean;

  awarenessLevel: TwinAwarenessLevel;
  trajectoryRiskWindow: TwinTrajectoryRiskWindow;

  emotionalState?: string | null;
  voiceState?: TwinControllerVoiceState | null;

  latestTwinText?: string | null;
  ambientText?: string | null;

  hasUrgentAlert?: boolean;
};

export type TwinPresentationControllerResult =
  TwinPresentationResult & {
    text: {
      primary: string | null;
      secondary: string | null;
      visible: boolean;
    };

    interaction: {
      tapAction:
        | "open-conversation"
        | "close-conversation"
        | "listen"
        | "acknowledge";
      canOpenConversation: boolean;
      canUseVoice: boolean;
      attentionRequired: boolean;
    };

    visual: {
      showParticles: boolean;
      showPulseRing: boolean;
      showGuardianHalo: boolean;
      showListeningHalo: boolean;
      showThinkingGather: boolean;
      showSpeakingPulse: boolean;
    };
  };

function cleanText(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getPrimaryText(
  input: TwinPresentationControllerInput,
  presentation: TwinPresentationResult,
): string | null {
  if (presentation.state === "guardian") {
    return (
      cleanText(input.latestTwinText) ??
      cleanText(input.ambientText) ??
      "Stay with me."
    );
  }

  if (presentation.state === "speaking") {
    return (
      cleanText(input.latestTwinText) ??
      cleanText(input.ambientText)
    );
  }

  if (presentation.state === "thinking") {
    return null;
  }

  if (presentation.state === "listening") {
    return "I'm listening.";
  }

  if (presentation.state === "memory") {
    return (
      cleanText(input.ambientText) ??
      cleanText(input.latestTwinText)
    );
  }

  if (presentation.state === "conversation") {
    return null;
  }

  return (
    cleanText(input.ambientText) ??
    cleanText(input.latestTwinText)
  );
}

function getSecondaryText(
  presentation: TwinPresentationResult,
): string | null {
  switch (presentation.state) {
    case "thinking":
      return "TwinMe is working through it.";

    case "listening":
      return "Speak naturally.";

    case "guardian":
      return "Your safety has priority.";

    case "memory":
      return "Something familiar surfaced.";

    default:
      return null;
  }
}

function getTapAction(
  presentation: TwinPresentationResult,
): TwinPresentationControllerResult["interaction"]["tapAction"] {
  if (presentation.state === "conversation") {
    return "close-conversation";
  }

  if (presentation.state === "guardian") {
    return "acknowledge";
  }

  if (presentation.state === "listening") {
    return "listen";
  }

  return "open-conversation";
}

export function buildTwinPresentationController(
  input: TwinPresentationControllerInput,
): TwinPresentationControllerResult {
  const presentation = getTwinPresentation({
    isListening: input.isListening,
    isThinking: input.isThinking,
    isSpeaking: input.isSpeaking,
    conversationOpen: input.conversationOpen,
    memoryMoment: input.memoryMoment,

    awarenessLevel: input.awarenessLevel,
    trajectoryRiskWindow: input.trajectoryRiskWindow,

    emotionalState: input.emotionalState,
    voiceState: input.voiceState,
  });

  const primary = getPrimaryText(input, presentation);
  const secondary = getSecondaryText(presentation);

  const attentionRequired =
    presentation.state === "guardian" ||
    input.hasUrgentAlert === true;

  return {
    ...presentation,

    text: {
      primary,
      secondary,
      visible:
        presentation.shouldShowAmbientText &&
        Boolean(primary || secondary),
    },

    interaction: {
      tapAction: getTapAction(presentation),
      canOpenConversation:
        presentation.state !== "guardian",
      canUseVoice:
        presentation.state !== "guardian" &&
        presentation.state !== "thinking",
      attentionRequired,
    },

    visual: {
      showParticles:
        presentation.animation.particleIntensity !== "off",

      showPulseRing:
        presentation.state === "speaking" ||
        presentation.state === "guardian",

      showGuardianHalo:
        presentation.state === "guardian",

      showListeningHalo:
        presentation.state === "listening",

      showThinkingGather:
        presentation.state === "thinking",

      showSpeakingPulse:
        presentation.state === "speaking",
    },
  };
}
