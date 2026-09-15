export type PartyTimelineEventType =
  | "party"
  | "status"
  | "checkin"
  | "location"
  | "tracking"
  | "privacy"
  | "risk"
  | "intervention"
  | "crew"
  | "system";

export type PartyTimelineEvent = {
  id: number;
  timestamp: string;
  time: string;
  message: string;
  type: PartyTimelineEventType;
};

const PARTY_TIMELINE_KEY = "twincore_party_timeline";
const PARTY_TIMELINE_EVENT = "twincore-party-timeline-updated";
const MAX_TIMELINE_EVENTS = 150;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getPartyTimeline(): PartyTimelineEvent[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(PARTY_TIMELINE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PartyTimelineEvent[];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (event) =>
        typeof event?.id === "number" &&
        typeof event?.timestamp === "string" &&
        typeof event?.time === "string" &&
        typeof event?.message === "string",
    );
  } catch {
    return [];
  }
}

export function addPartyTimelineEvent(
  message: string,
  type: PartyTimelineEventType = "system",
): PartyTimelineEvent | null {
  if (!isBrowser() || !message.trim()) return null;

  const now = new Date();

  const event: PartyTimelineEvent = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    timestamp: now.toISOString(),
    time: now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    message: message.trim(),
    type,
  };

  const current = getPartyTimeline();
  const next = [event, ...current].slice(0, MAX_TIMELINE_EVENTS);

  window.localStorage.setItem(
    PARTY_TIMELINE_KEY,
    JSON.stringify(next),
  );

  window.dispatchEvent(
    new CustomEvent(PARTY_TIMELINE_EVENT, {
      detail: event,
    }),
  );

  return event;
}

export function clearPartyTimeline() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(PARTY_TIMELINE_KEY);
  window.dispatchEvent(new Event(PARTY_TIMELINE_EVENT));
}

export function subscribeToPartyTimeline(
  listener: () => void,
) {
  if (!isBrowser()) return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PARTY_TIMELINE_KEY) {
      listener();
    }
  };

  window.addEventListener(PARTY_TIMELINE_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PARTY_TIMELINE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
