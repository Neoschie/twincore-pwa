export type TonightOccasion =
  | "Dinner"
  | "Club"
  | "Bar / Lounge"
  | "Concert"
  | "Birthday"
  | "Anniversary"
  | "Date Night"
  | "Graduation"
  | "Wedding"
  | "House Party"
  | "Work Event"
  | "Special Event"
  | "Other";

export type TonightContext = {
  version: 1;

  /**
   * CURRENT intent.
   * This is tonight — not permanent identity.
   */
  vibeId?: string | null;
  vibeLabel?: string | null;

  occasion?: TonightOccasion | null;

  destination?: string | null;
  venue?: string | null;

  /**
   * Must remain null until known/verified.
   * TwinMe should never invent venue dress code.
   */
  dressCode?: string | null;

  startTime?: string | null;

  weatherSummary?: string | null;

  budget?: string | null;
  desiredFeeling?: string | null;

  foodMood?: string | null;

  transportation?: {
    mode?: string | null;
    needsRideHome?: boolean | null;
  } | null;

  crew?: {
    count?: number | null;
    connected?: number | null;
  } | null;

  fit?: {
    mode?: "check" | "build" | "rescue" | null;
    locked?: boolean;
    swagMove?: string | null;
  } | null;

  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export const TONIGHT_CONTEXT_EVENT = "twincore:tonight-context-change";

export const TONIGHT_CONTEXT_STORAGE_KEY = "twincore_tonight_context_v1";

export const TONIGHT_CONTEXT_TTL_HOURS = 18;

export function createTonightContext(): TonightContext {
  const now = Date.now();

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + TONIGHT_CONTEXT_TTL_HOURS * 60 * 60 * 1000,
  };
}

export function isTonightContextExpired(context: TonightContext) {
  return Date.now() >= context.expiresAt;
}

export function mergeTonightContext(
  current: TonightContext,
  patch: Partial<TonightContext>,
): TonightContext {
  const now = Date.now();

  return {
    ...current,
    ...patch,

    transportation:
      patch.transportation === undefined
        ? current.transportation
        : {
            ...(current.transportation ?? {}),
            ...(patch.transportation ?? {}),
          },

    crew:
      patch.crew === undefined
        ? current.crew
        : {
            ...(current.crew ?? {}),
            ...(patch.crew ?? {}),
          },

    fit:
      patch.fit === undefined
        ? current.fit
        : {
            ...(current.fit ?? {}),
            ...(patch.fit ?? {}),
          },

    version: 1,
    updatedAt: now,

    // Context keeps living while tonight is actively used.
    expiresAt: now + TONIGHT_CONTEXT_TTL_HOURS * 60 * 60 * 1000,
  };
}
