// TWINCORE_FYI_TODAY_INTELLIGENCE_R15_8
//
// Intelligence boundary between verified Life Context and
// the future FYI Today experience.
//
// FYI Today answers:
//
//   "What verified context is worth surfacing right now?"
//
// This layer creates briefing CANDIDATES only.
//
// It MUST NOT:
// - fabricate missing context
// - turn UNKNOWN into a briefing
// - create Venue Fit scores
// - create Move decisions
// - score Crew
// - publish recommendations
// - override Safety
// - create automatic actions
// - treat every known signal as equally important

import type {
  LifeContextDomain,
  LifeContextSignal,
} from "@/lib/twinme/life-context";

import type {
  LifeContextPriority,
  LifeContextPrioritySnapshot,
  PrioritizedLifeContextSignal,
} from "@/lib/twinme/life-context-priority";

export type FyiTodayCategory =
  | "PRIORITY"
  | "PEOPLE"
  | "TRAVEL"
  | "LIFESTYLE"
  | "PLANS"
  | "GOALS"
  | "MONEY"
  | "LOCATION"
  | "ROUTINE"
  | "TONIGHT";

export type FyiTodayCandidate = {
  id: string;
  category: FyiTodayCategory;

  /**
   * Verified context suitable for briefing presentation.
   */
  summary: string;

  priority: Exclude<LifeContextPriority, "NONE">;

  /**
   * Original evidence remains attached so future consumers
   * can preserve provenance rather than invent context.
   */
  signal: LifeContextSignal;

  /**
   * Advisory presentation order only.
   *
   * This is NOT a domain decision score.
   */
  presentationWeight: number;
};

export type FyiTodaySnapshot = {
  candidates: FyiTodayCandidate[];
  leadCandidate: FyiTodayCandidate | null;
  hasBriefing: boolean;
  generatedAt: number;
};

function categoryForDomain(
  domain: LifeContextDomain,
): FyiTodayCategory {
  switch (domain) {
    case "PEOPLE":
      return "PEOPLE";

    case "TRAVEL":
      return "TRAVEL";

    case "LIFESTYLE":
      return "LIFESTYLE";

    case "PLANS":
    case "SCHEDULE":
      return "PLANS";

    case "GOALS":
      return "GOALS";

    case "MONEY":
      return "MONEY";

    case "LOCATION":
      return "LOCATION";

    case "ROUTINE":
      return "ROUTINE";

    case "TONIGHT":
      return "TONIGHT";

    default:
      return "PRIORITY";
  }
}

function candidateFromPrioritizedSignal(
  item: PrioritizedLifeContextSignal,
): FyiTodayCandidate | null {
  const summary = item.signal.summary.trim();

  // Empty or UNKNOWN evidence must never become a briefing.
  if (
    summary.length === 0 ||
    item.signal.strength === "UNKNOWN"
  ) {
    return null;
  }

  return {
    id: `fyi:${item.signal.id}`,
    category: categoryForDomain(item.signal.domain),
    summary,
    priority: item.priority,
    signal: item.signal,
    presentationWeight: item.attentionWeight,
  };
}

export function buildFyiTodaySnapshot(
  prioritySnapshot: LifeContextPrioritySnapshot,
  now = Date.now(),
): FyiTodaySnapshot {
  if (
    prioritySnapshot.priority === "NONE" ||
    prioritySnapshot.signals.length === 0
  ) {
    return {
      candidates: [],
      leadCandidate: null,
      hasBriefing: false,
      generatedAt: now,
    };
  }

  const candidates = prioritySnapshot.signals
    .map(candidateFromPrioritizedSignal)
    .filter(
      (candidate): candidate is FyiTodayCandidate =>
        candidate !== null,
    );

  return {
    candidates,
    leadCandidate: candidates[0] ?? null,
    hasBriefing: candidates.length > 0,
    generatedAt: now,
  };
}
