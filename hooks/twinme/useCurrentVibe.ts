"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createCurrentVibe,
  getTwinVibeChoices,
  isCurrentVibeExpired,
  type TwinCurrentVibe,
  type TwinVibeChoice,
  type TwinVibeDomain,
} from "@/lib/twinme/vibe";

const STORAGE_PREFIX = "twincore_current_vibe_";
const GLOBAL_EVENT = "twincore:vibe-change";

function storageKey(domain: TwinVibeDomain) {
  return `${STORAGE_PREFIX}${domain}`;
}

function readStoredVibe(domain: TwinVibeDomain): TwinCurrentVibe | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(domain));

    if (!raw) return null;

    const parsed = JSON.parse(raw) as TwinCurrentVibe;

    if (
      !parsed ||
      parsed.domain !== domain ||
      !parsed.choice ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    if (isCurrentVibeExpired(parsed)) {
      window.localStorage.removeItem(storageKey(domain));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function useCurrentVibe(domain: TwinVibeDomain, ttlHours = 12) {
  const [currentVibe, setCurrentVibe] = useState<TwinCurrentVibe | null>(null);

  // TWINCORE_CURRENT_VIBE_HYDRATION_R14_6F5
  // Consumers must be able to distinguish an authoritative
  // "no current vibe" from the pre-localStorage hydration null.
  const [hydrated, setHydrated] = useState(false);

  const choices = useMemo(() => getTwinVibeChoices(domain), [domain]);

  useEffect(() => {
    setHydrated(false);
    setCurrentVibe(readStoredVibe(domain));
    setHydrated(true);
  }, [domain]);

  useEffect(() => {
    const onStorage = () => {
      setCurrentVibe(readStoredVibe(domain));
    };

    const onVibeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ domain?: TwinVibeDomain }>;

      if (!customEvent.detail?.domain || customEvent.detail.domain === domain) {
        setCurrentVibe(readStoredVibe(domain));
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(GLOBAL_EVENT, onVibeChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(GLOBAL_EVENT, onVibeChange);
    };
  }, [domain]);

  const selectVibe = useCallback(
    (choice: TwinVibeChoice) => {
      const next = createCurrentVibe(domain, choice, ttlHours);

      setCurrentVibe(next);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(domain), JSON.stringify(next));

        window.dispatchEvent(
          new CustomEvent(GLOBAL_EVENT, {
            detail: {
              domain,
              vibe: next,
            },
          }),
        );
      }

      return next;
    },
    [domain, ttlHours],
  );

  const selectVibeById = useCallback(
    (choiceId: string) => {
      const choice = choices.find((candidate) => candidate.id === choiceId);

      if (!choice) return null;

      return selectVibe(choice);
    },
    [choices, selectVibe],
  );

  const clearVibe = useCallback(() => {
    setCurrentVibe(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey(domain));

      window.dispatchEvent(
        new CustomEvent(GLOBAL_EVENT, {
          detail: {
            domain,
            vibe: null,
          },
        }),
      );
    }
  }, [domain]);

  return {
    domain,
    choices,
    currentVibe,
    hydrated,
    selectedChoice: currentVibe?.choice ?? null,
    selectVibe,
    selectVibeById,
    clearVibe,
  };
}
