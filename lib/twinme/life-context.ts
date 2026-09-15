// TWINCORE_LIFE_CONTEXT_CONTRACT_R15_3
//
// Canonical cross-domain context boundary for TwinCore.
//
// Life Context answers:
//
//   "What is meaningfully true about the user's life right now?"
//
// It does NOT decide what the user should do.
// It does NOT replace domain intelligence.
// It does NOT replace Tonight Context.
// It does NOT fabricate unknown information.
//
// Domain systems remain authoritative over their own evidence.

export type LifeContextDomain =
  | "SCHEDULE"
  | "PEOPLE"
  | "LOCATION"
  | "PLANS"
  | "GOALS"
  | "TRAVEL"
  | "MONEY"
  | "LIFESTYLE"
  | "ROUTINE"
  | "TONIGHT";

export type LifeContextSignalStrength =
  | "UNKNOWN"
  | "WEAK"
  | "MODERATE"
  | "STRONG";

export type LifeContextSource =
  | "USER"
  | "TWINME"
  | "TONIGHT_CONTEXT"
  | "CREW"
  | "PARTY"
  | "SPOTS"
  | "MEMORY"
  | "PREDICTIVE"
  | "SYSTEM";

export type LifeContextSignal = {
  id: string;

  domain: LifeContextDomain;

  /**
   * Human-readable statement of known context.
   *
   * Example:
   * "Dinner planned tonight."
   *
   * This must describe evidence, not invent it.
   */
  summary: string;

  source: LifeContextSource;

  strength: LifeContextSignalStrength;

  /**
   * When the underlying evidence was observed.
   */
  observedAt: number;

  /**
   * Optional expiration for temporary context.
   *
   * null means the producer has not assigned an expiry.
   */
  expiresAt: number | null;
};

export type LifeContext = {
  version: 1;

  /**
   * Canonical collection of currently known cross-domain signals.
   *
   * Absence of a signal means UNKNOWN.
   * UNKNOWN must never be filled with invented context.
   */
  signals: LifeContextSignal[];

  createdAt: number;
  updatedAt: number;
};

// TWINCORE_LIFE_CONTEXT_AUTHORITY_R15_3
//
// Life Context is evidence infrastructure.
//
// It MAY:
// - represent verified/current context
// - carry context between TwinCore domains
// - expose context to TwinMe
// - later support priority intelligence
// - later support FYI Today
//
// It MUST NOT:
// - create Venue Fit scores
// - create Move decisions
// - score Crew
// - publish recommendations
// - override Safety
// - convert unknown context into assumed context
// - treat temporary context as permanent identity

export const LIFE_CONTEXT_VERSION = 1 as const;

export function createLifeContext(now = Date.now()): LifeContext {
  return {
    version: LIFE_CONTEXT_VERSION,
    signals: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function isLifeContextSignalActive(
  signal: LifeContextSignal,
  now = Date.now(),
): boolean {
  return signal.expiresAt === null || signal.expiresAt > now;
}

export function getActiveLifeContextSignals(
  context: LifeContext,
  now = Date.now(),
): LifeContextSignal[] {
  return context.signals.filter((signal) =>
    isLifeContextSignalActive(signal, now),
  );
}

export function getLifeContextSignalsByDomain(
  context: LifeContext,
  domain: LifeContextDomain,
  now = Date.now(),
): LifeContextSignal[] {
  return getActiveLifeContextSignals(context, now).filter(
    (signal) => signal.domain === domain,
  );
}

// TWINCORE_LIFE_CONTEXT_RUNTIME_R15_4
//
// Controlled browser runtime boundary for canonical Life Context.
//
// Producers may publish verified evidence here.
// Consumers may read/subscribe to that evidence.
//
// Publishing context does NOT transfer decision authority.

export const LIFE_CONTEXT_STORAGE_KEY =
  "twincore_life_context_v1";

export const LIFE_CONTEXT_UPDATE_EVENT =
  "twincore:life-context-change";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

function isLifeContext(value: unknown): value is LifeContext {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LifeContext>;

  return (
    candidate.version === LIFE_CONTEXT_VERSION &&
    Array.isArray(candidate.signals) &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.updatedAt === "number"
  );
}

export function readLifeContext(): LifeContext {
  if (!isBrowserRuntime()) {
    return createLifeContext();
  }

  const raw = window.localStorage.getItem(
    LIFE_CONTEXT_STORAGE_KEY,
  );

  if (!raw) {
    return createLifeContext();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isLifeContext(parsed)) {
      return createLifeContext();
    }

    return {
      ...parsed,
      signals: getActiveLifeContextSignals(parsed),
    };
  } catch {
    return createLifeContext();
  }
}

export function publishLifeContext(
  context: LifeContext,
): LifeContext {
  const now = Date.now();

  const next: LifeContext = {
    ...context,
    version: LIFE_CONTEXT_VERSION,
    signals: getActiveLifeContextSignals(context, now),
    updatedAt: now,
  };

  if (!isBrowserRuntime()) {
    return next;
  }

  window.localStorage.setItem(
    LIFE_CONTEXT_STORAGE_KEY,
    JSON.stringify(next),
  );

  window.dispatchEvent(
    new CustomEvent(LIFE_CONTEXT_UPDATE_EVENT, {
      detail: next,
    }),
  );

  return next;
}

export function publishLifeContextSignal(
  signal: LifeContextSignal,
): LifeContext {
  const current = readLifeContext();
  const now = Date.now();

  const activeSignals =
    getActiveLifeContextSignals(current, now);

  const signals = [
    ...activeSignals.filter(
      (existing) => existing.id !== signal.id,
    ),
    signal,
  ];

  return publishLifeContext({
    ...current,
    signals,
    updatedAt: now,
  });
}

export function removeLifeContextSignal(
  signalId: string,
): LifeContext {
  const current = readLifeContext();

  return publishLifeContext({
    ...current,
    signals: current.signals.filter(
      (signal) => signal.id !== signalId,
    ),
    updatedAt: Date.now(),
  });
}

export function subscribeToLifeContext(
  listener: (context: LifeContext) => void,
): () => void {
  if (!isBrowserRuntime()) {
    return () => undefined;
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent =
      event as CustomEvent<LifeContext>;

    if (isLifeContext(customEvent.detail)) {
      listener(customEvent.detail);
      return;
    }

    listener(readLifeContext());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== LIFE_CONTEXT_STORAGE_KEY) {
      return;
    }

    listener(readLifeContext());
  };

  window.addEventListener(
    LIFE_CONTEXT_UPDATE_EVENT,
    handleCustomEvent,
  );

  window.addEventListener(
    "storage",
    handleStorage,
  );

  return () => {
    window.removeEventListener(
      LIFE_CONTEXT_UPDATE_EVENT,
      handleCustomEvent,
    );

    window.removeEventListener(
      "storage",
      handleStorage,
    );
  };
}
