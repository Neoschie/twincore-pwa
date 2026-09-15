"use client";

import {
  useCallback,
  useSyncExternalStore,
} from "react";

import {
  clearPresence,
  clearPresenceSource,
  getPresenceSnapshot,
  pushPresenceEvent,
  refreshPresence,
  removePresenceEvent,
  subscribePresence,
} from "./presence-store";

import {
  createPresenceEvent,
  type TwinPresenceEvent,
  type TwinPresenceSource,
} from "./presence-events";

export function usePresence() {
  const presence = useSyncExternalStore(
    subscribePresence,
    getPresenceSnapshot,
    getPresenceSnapshot,
  );

  const push = useCallback(
    (
      input: Omit<TwinPresenceEvent, "id" | "createdAt">,
    ) => {
      const event = createPresenceEvent(input);
      return pushPresenceEvent(event);
    },
    [],
  );

  const remove = useCallback((id: string) => {
    removePresenceEvent(id);
  }, []);

  const clearSource = useCallback(
    (source: TwinPresenceSource) => {
      clearPresenceSource(source);
    },
    [],
  );

  return {
    ...presence,

    push,
    remove,
    clearSource,
    clearAll: clearPresence,
    refresh: refreshPresence,
  };
}
