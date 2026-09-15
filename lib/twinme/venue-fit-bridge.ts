export type VenueFitDimension =
  "INTENT" | "ENERGY" | "LIVE" | "PRACTICAL" | "STABILITY";

export type VenueFitSignalStrength = "unknown" | "weak" | "moderate" | "strong";

export type VenueFitDimensionRead = {
  /**
   * Canonical R14.3 venue-fit dimension.
   *
   * Dimensions describe WHY the existing Spots
   * recommendation fits.
   *
   * They do not independently rank venues.
   */
  dimension: VenueFitDimension;

  /**
   * Strength of real evidence supporting this dimension.
   * UNKNOWN must remain possible when evidence is absent.
   */
  strength: VenueFitSignalStrength;

  /**
   * Human-readable explanation derived only from
   * signals actually available to TwinCore.
   */
  reason: string;

  /**
   * Optional supporting facts.
   * These are explainability evidence, not hidden scores.
   */
  evidence: string[];
};

export type SharedVenueFit = {
  /**
   * Venue already selected by Spots.
   *
   * R14.3 MUST NOT create a competing venue ranking system.
   */
  spotName: string | null;

  /**
   * Existing Spots match confidence.
   *
   * This remains the authoritative venue-match number.
   */
  matchConfidence: number | null;

  /**
   * Explainability reads describing why this venue
   * currently fits the night.
   */
  dimensions: VenueFitDimensionRead[];

  /**
   * Existing recommendation reasons may pass through
   * without being reimplemented.
   */
  recommendationReasons: string[];

  /**
   * True only when at least one meaningful venue-fit
   * dimension is supported by current evidence.
   */
  hasMeaningfulFit: boolean;

  /**
   * Timestamp for cross-module freshness.
   */
  updatedAt: string;
};

const STORAGE_KEY = "twincore_venue_fit_v1";
const UPDATE_EVENT = "twincore-venue-fit-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function isValidDimension(value: unknown): value is VenueFitDimension {
  return (
    typeof value === "string" &&
    ["INTENT", "ENERGY", "LIVE", "PRACTICAL", "STABILITY"].includes(value)
  );
}

function isValidStrength(value: unknown): value is VenueFitSignalStrength {
  return (
    typeof value === "string" &&
    ["unknown", "weak", "moderate", "strong"].includes(value)
  );
}

export function readVenueFit(): SharedVenueFit | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SharedVenueFit;

    if (
      !parsed ||
      !Array.isArray(parsed.dimensions) ||
      !Array.isArray(parsed.recommendationReasons) ||
      typeof parsed.hasMeaningfulFit !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    const dimensions = parsed.dimensions.filter(
      (read): read is VenueFitDimensionRead =>
        Boolean(
          read &&
          isValidDimension(read.dimension) &&
          isValidStrength(read.strength) &&
          typeof read.reason === "string" &&
          Array.isArray(read.evidence),
        ),
    );

    return {
      ...parsed,
      spotName: typeof parsed.spotName === "string" ? parsed.spotName : null,
      matchConfidence:
        typeof parsed.matchConfidence === "number" &&
        Number.isFinite(parsed.matchConfidence)
          ? parsed.matchConfidence
          : null,
      dimensions: dimensions.map((read) => ({
        ...read,
        evidence: read.evidence.filter(
          (item): item is string => typeof item === "string",
        ),
      })),
      recommendationReasons: parsed.recommendationReasons.filter(
        (reason): reason is string => typeof reason === "string",
      ),
    };
  } catch {
    return null;
  }
}

export function publishVenueFit(fit: Omit<SharedVenueFit, "updatedAt">) {
  if (!isBrowser()) return;

  const payload: SharedVenueFit = {
    ...fit,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  window.dispatchEvent(
    new CustomEvent(UPDATE_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribeToVenueFit(listener: () => void) {
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
