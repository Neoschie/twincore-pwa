export type MoveCandidateDecision = "STAY" | "MOVE" | "WAIT" | "EXIT";

export type MoveCandidateConfidence = "low" | "medium" | "high";

export type SharedMoveCandidate = {
  /**
   * R14.2 — Canonical TwinMe movement decision.
   *
   * This layer does NOT decide which venue is best.
   * Spots owns venue ranking.
   *
   * This layer decides whether the currently recommended
   * venue represents the right next move.
   */
  decision: MoveCandidateDecision;

  /**
   * Human-readable primary recommendation.
   */
  headline: string;
  message: string;

  /**
   * Explainability layer.
   * Never fabricate reasons that are not supported
   * by current TwinCore signals.
   */
  reasons: string[];

  /**
   * Recommended destination when movement is appropriate.
   * Must remain null when no verified destination exists.
   */
  destination: string | null;

  /**
   * Venue intelligence inherited from Spots.
   */
  venueMatchConfidence: number | null;

  /**
   * Confidence in the MOVE DECISION itself.
   * This is separate from venue match confidence.
   */
  decisionConfidence: MoveCandidateConfidence;

  /**
   * Existing arrival intelligence may be carried forward
   * without being reimplemented here.
   */
  arrivalRecommendation?: {
    label: string;
    colour: string;
    message: string;
  } | null;

  /**
   * Safety can constrain or override movement.
   */
  safetyOverride: boolean;

  /**
   * Timestamp used for freshness and cross-module sync.
   */
  updatedAt: string;
};

const STORAGE_KEY = "twincore_move_candidate_v1";
const UPDATE_EVENT = "twincore-move-candidate-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readMoveCandidate(): SharedMoveCandidate | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SharedMoveCandidate;

    if (
      !parsed ||
      !["STAY", "MOVE", "WAIT", "EXIT"].includes(parsed.decision) ||
      typeof parsed.headline !== "string" ||
      typeof parsed.message !== "string" ||
      !Array.isArray(parsed.reasons) ||
      typeof parsed.safetyOverride !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      reasons: parsed.reasons.filter(
        (reason): reason is string => typeof reason === "string",
      ),
    };
  } catch {
    return null;
  }
}

export function publishMoveCandidate(
  candidate: Omit<SharedMoveCandidate, "updatedAt">,
) {
  if (!isBrowser()) return;

  const payload: SharedMoveCandidate = {
    ...candidate,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  window.dispatchEvent(
    new CustomEvent(UPDATE_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribeToMoveCandidate(listener: () => void) {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(UPDATE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(UPDATE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
