import type {
  TwinPresenceEvent,
  TwinPresenceMode,
  TwinPresencePriority,
} from "./presence-events";

const PRIORITY_WEIGHT: Record<TwinPresencePriority, number> = {
  ambient: 0,
  normal: 1,
  important: 2,
  urgent: 3,
};

export type TwinPresenceSnapshot = {
  mode: TwinPresenceMode;
  activeEvent: TwinPresenceEvent | null;
  message: string | null;
  secondaryMessage: string | null;
  attentionRequired: boolean;
};

export const DEFAULT_PRESENCE: TwinPresenceSnapshot = {
  mode: "ambient",
  activeEvent: null,
  message: null,
  secondaryMessage: null,
  attentionRequired: false,
};

function isExpired(event: TwinPresenceEvent, now: number): boolean {
  return (
    typeof event.expiresAt === "number" &&
    event.expiresAt <= now
  );
}

export function resolvePresence(
  events: TwinPresenceEvent[],
  now = Date.now(),
): TwinPresenceSnapshot {
  const valid = events.filter((event) => !isExpired(event, now));

  if (!valid.length) {
    return DEFAULT_PRESENCE;
  }

  const sorted = [...valid].sort((a, b) => {
    const priorityDifference =
      PRIORITY_WEIGHT[b.priority] -
      PRIORITY_WEIGHT[a.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return b.createdAt - a.createdAt;
  });

  const activeEvent = sorted[0];

  return {
    mode: activeEvent.mode,
    activeEvent,
    message: activeEvent.message ?? null,
    secondaryMessage: activeEvent.secondaryMessage ?? null,
    attentionRequired:
      activeEvent.priority === "important" ||
      activeEvent.priority === "urgent",
  };
}
