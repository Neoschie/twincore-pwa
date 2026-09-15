// TWINCORE_LIFE_CONTEXT_PRIORITY_R15_6
//
// Advisory prioritization boundary for canonical Life Context.
//
// This layer answers:
//
//   "Which verified context deserves attention first?"
//
// It ranks known evidence only.
//
// It MUST NOT:
// - invent missing context
// - create Venue Fit scores
// - create Move decisions
// - score Crew
// - publish recommendations
// - override Safety
// - convert priority into automatic action

import {
  getActiveLifeContextSignals,
  type LifeContext,
  type LifeContextSignal,
} from "@/lib/twinme/life-context";

export type LifeContextPriority =
  | "URGENT"
  | "HIGH"
  | "NORMAL"
  | "LOW"
  | "NONE";

export type LifeContextPriorityReason =
  | "STRONG_CURRENT_EVIDENCE"
  | "MODERATE_CURRENT_EVIDENCE"
  | "WEAK_CURRENT_EVIDENCE"
  | "UNKNOWN_EVIDENCE"
  | "NO_ACTIVE_CONTEXT";

export type PrioritizedLifeContextSignal = {
  signal: LifeContextSignal;
  priority: Exclude<LifeContextPriority, "NONE">;
  reason: Exclude<
    LifeContextPriorityReason,
    "NO_ACTIVE_CONTEXT"
  >;

  /**
   * Advisory ordering value only.
   *
   * This is NOT a Venue score, Move score, Crew score,
   * recommendation score, or Safety score.
   */
  attentionWeight: number;
};

export type LifeContextPrioritySnapshot = {
  priority: LifeContextPriority;
  reason: LifeContextPriorityReason;

  /**
   * Active evidence ordered by attention relevance.
   */
  signals: PrioritizedLifeContextSignal[];

  /**
   * Highest-ranked verified evidence, if one exists.
   */
  leadSignal: PrioritizedLifeContextSignal | null;

  evaluatedAt: number;
};

function priorityForSignal(
  signal: LifeContextSignal,
): PrioritizedLifeContextSignal {
  switch (signal.strength) {
    case "STRONG":
      return {
        signal,
        priority: "HIGH",
        reason: "STRONG_CURRENT_EVIDENCE",
        attentionWeight: 3,
      };

    case "MODERATE":
      return {
        signal,
        priority: "NORMAL",
        reason: "MODERATE_CURRENT_EVIDENCE",
        attentionWeight: 2,
      };

    case "WEAK":
      return {
        signal,
        priority: "LOW",
        reason: "WEAK_CURRENT_EVIDENCE",
        attentionWeight: 1,
      };

    case "UNKNOWN":
    default:
      return {
        signal,
        priority: "LOW",
        reason: "UNKNOWN_EVIDENCE",
        attentionWeight: 0,
      };
  }
}

function priorityRank(
  priority: Exclude<LifeContextPriority, "NONE">,
): number {
  switch (priority) {
    case "URGENT":
      return 4;
    case "HIGH":
      return 3;
    case "NORMAL":
      return 2;
    case "LOW":
      return 1;
  }
}

export function evaluateLifeContextPriority(
  context: LifeContext,
  now = Date.now(),
): LifeContextPrioritySnapshot {
  const activeSignals =
    getActiveLifeContextSignals(context, now);

  if (activeSignals.length === 0) {
    return {
      priority: "NONE",
      reason: "NO_ACTIVE_CONTEXT",
      signals: [],
      leadSignal: null,
      evaluatedAt: now,
    };
  }

  const signals = activeSignals
    .map(priorityForSignal)
    .sort((a, b) => {
      const priorityDifference =
        priorityRank(b.priority) -
        priorityRank(a.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (b.attentionWeight !== a.attentionWeight) {
        return b.attentionWeight - a.attentionWeight;
      }

      return b.signal.observedAt - a.signal.observedAt;
    });

  const leadSignal = signals[0] ?? null;

  return {
    priority: leadSignal?.priority ?? "NONE",
    reason:
      leadSignal?.reason ?? "NO_ACTIVE_CONTEXT",
    signals,
    leadSignal,
    evaluatedAt: now,
  };
}
