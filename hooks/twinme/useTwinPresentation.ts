"use client";

import { useMemo } from "react";

import {
  buildTwinPresentationController,
  type TwinAwarenessLevel,
  type TwinControllerVoiceState,
  type TwinPresentationControllerResult,
  type TwinTrajectoryRiskWindow,
} from "@/lib/twinme/presentation-controller";

type UseTwinPresentationInput = {
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

export function useTwinPresentation(
  input: UseTwinPresentationInput,
): TwinPresentationControllerResult {
  return useMemo(
    () =>
      buildTwinPresentationController({
        isListening: input.isListening,
        isThinking: input.isThinking,
        isSpeaking: input.isSpeaking,
        conversationOpen: input.conversationOpen,
        memoryMoment: input.memoryMoment,

        awarenessLevel: input.awarenessLevel,
        trajectoryRiskWindow: input.trajectoryRiskWindow,

        emotionalState: input.emotionalState,
        voiceState: input.voiceState,

        latestTwinText: input.latestTwinText,
        ambientText: input.ambientText,

        hasUrgentAlert: input.hasUrgentAlert,
      }),
    [
      input.isListening,
      input.isThinking,
      input.isSpeaking,
      input.conversationOpen,
      input.memoryMoment,
      input.awarenessLevel,
      input.trajectoryRiskWindow,
      input.emotionalState,
      input.voiceState,
      input.latestTwinText,
      input.ambientText,
      input.hasUrgentAlert,
    ],
  );
}
