"use client";

// TWINCORE_TWINME_LIFE_CONTEXT_AWARENESS_R15_7
//
// TwinMe awareness boundary for canonical Life Context.
//
// This hook lets TwinMe:
// - read current verified Life Context
// - stay synchronized with context updates
// - evaluate advisory attention priority
// - expose one stable awareness snapshot
//
// It MUST NOT:
// - fabricate missing context
// - create Venue Fit scores
// - create Move decisions
// - score Crew
// - publish recommendations
// - override Safety
// - convert priority directly into action

import { useEffect, useMemo, useState } from "react";

import {
  createLifeContext,
  getActiveLifeContextSignals,
  readLifeContext,
  subscribeToLifeContext,
  type LifeContext,
} from "@/lib/twinme/life-context";

import {
  evaluateLifeContextPriority,
  type LifeContextPrioritySnapshot,
} from "@/lib/twinme/life-context-priority";

export type TwinMeLifeContextAwareness = {
  context: LifeContext;
  priority: LifeContextPrioritySnapshot;
  activeSignalCount: number;
  hasActiveContext: boolean;
  leadSummary: string | null;
};

function initialLifeContext(): LifeContext {
  if (typeof window === "undefined") {
    return createLifeContext();
  }

  return readLifeContext();
}

export function useLifeContextAwareness():
  TwinMeLifeContextAwareness {
  const [context, setContext] =
    useState<LifeContext>(initialLifeContext);

  useEffect(() => {
    setContext(readLifeContext());

    return subscribeToLifeContext((nextContext) => {
      setContext(nextContext);
    });
  }, []);

  return useMemo(() => {
    const now = Date.now();

    const activeSignals =
      getActiveLifeContextSignals(context, now);

    const priority =
      evaluateLifeContextPriority(context, now);

    return {
      context,
      priority,
      activeSignalCount: activeSignals.length,
      hasActiveContext: activeSignals.length > 0,
      leadSummary:
        priority.leadSignal?.signal.summary ?? null,
    };
  }, [context]);
}
