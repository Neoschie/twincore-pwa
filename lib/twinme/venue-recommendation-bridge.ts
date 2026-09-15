export type VenueArrivalRecommendation = {
  label: string;
  colour: string;
  message: string;
};

export type SharedVenueRecommendation = {
  spotName: string;
  message: string;
  reasons: string[];
  matchConfidence: number;
  arrivalRecommendation?: VenueArrivalRecommendation | null;
  updatedAt: string;
};

const STORAGE_KEY = "twincore_venue_recommendation";
const UPDATE_EVENT = "twincore-venue-recommendation-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readVenueRecommendation():
  | SharedVenueRecommendation
  | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SharedVenueRecommendation;

    if (
      !parsed ||
      typeof parsed.spotName !== "string" ||
      typeof parsed.message !== "string" ||
      typeof parsed.matchConfidence !== "number"
    ) {
      return null;
    }

    return {
      ...parsed,
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.filter(
            (reason): reason is string =>
              typeof reason === "string",
          )
        : [],
    };
  } catch {
    return null;
  }
}

export function publishVenueRecommendation(
  recommendation: Omit<SharedVenueRecommendation, "updatedAt">,
) {
  if (!isBrowser()) return;

  const payload: SharedVenueRecommendation = {
    ...recommendation,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(payload),
  );

  window.dispatchEvent(
    new CustomEvent(UPDATE_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribeToVenueRecommendation(
  listener: () => void,
) {
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
