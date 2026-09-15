"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createTonightContext,
  isTonightContextExpired,
  mergeTonightContext,
  TONIGHT_CONTEXT_EVENT,
  TONIGHT_CONTEXT_STORAGE_KEY,
  type TonightContext,
} from "@/lib/twinme/tonight-context";

function readTonightContext(): TonightContext {
  if (typeof window === "undefined") {
    return createTonightContext();
  }

  try {
    const raw = window.localStorage.getItem(TONIGHT_CONTEXT_STORAGE_KEY);

    if (!raw) {
      return createTonightContext();
    }

    const parsed = JSON.parse(raw) as TonightContext;

    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.expiresAt !== "number" ||
      isTonightContextExpired(parsed)
    ) {
      window.localStorage.removeItem(TONIGHT_CONTEXT_STORAGE_KEY);

      return createTonightContext();
    }

    return parsed;
  } catch {
    return createTonightContext();
  }
}

function persistTonightContext(context: TonightContext) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    TONIGHT_CONTEXT_STORAGE_KEY,
    JSON.stringify(context),
  );

  window.dispatchEvent(
    new CustomEvent(TONIGHT_CONTEXT_EVENT, {
      detail: context,
    }),
  );
}

export function useTonightContext() {
  const [tonight, setTonight] = useState<TonightContext>(() =>
    createTonightContext(),
  );

  /**
   * R11.7.1
   *
   * Keep the freshest Tonight Context outside React's
   * functional state updater so persistence/event dispatch
   * never happens while React is evaluating an updater.
   */
  const tonightRef = useRef<TonightContext>(tonight);

  useEffect(() => {
    const stored = readTonightContext();

    tonightRef.current = stored;
    setTonight(stored);
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = readTonightContext();

      tonightRef.current = next;
      setTonight(next);
    };

    window.addEventListener(TONIGHT_CONTEXT_EVENT, sync);

    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(TONIGHT_CONTEXT_EVENT, sync);

      window.removeEventListener("storage", sync);
    };
  }, []);

  const updateTonight = useCallback(
    (
      patch:
        | Partial<TonightContext>
        | ((current: TonightContext) => Partial<TonightContext>),
    ) => {
      const currentState = tonightRef.current;

      const current = isTonightContextExpired(currentState)
        ? createTonightContext()
        : currentState;

      const resolved = typeof patch === "function" ? patch(current) : patch;

      const next = mergeTonightContext(current, resolved);

      /**
       * IMPORTANT:
       * React state mutation stays separate from
       * localStorage + CustomEvent side effects.
       */
      tonightRef.current = next;
      setTonight(next);

      persistTonightContext(next);
    },
    [],
  );

  const clearTonight = useCallback(() => {
    const fresh = createTonightContext();

    tonightRef.current = fresh;
    setTonight(fresh);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TONIGHT_CONTEXT_STORAGE_KEY);

      window.dispatchEvent(
        new CustomEvent(TONIGHT_CONTEXT_EVENT, {
          detail: fresh,
        }),
      );
    }
  }, []);

  return {
    tonight,
    updateTonight,
    clearTonight,
  };
}
