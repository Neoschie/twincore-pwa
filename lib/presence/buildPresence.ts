export type PresenceState =
  | "calm"
  | "reflective"
  | "thinking"
  | "protective";

export type PresenceOutput = {
  state: PresenceState;
  presence: number;
  energy: number;
  intensity: number;
};

export type PresenceInput = {
  awarenessScore?: number;
};

export function buildPresence(
  input: PresenceInput = {}
): PresenceOutput {

  const awareness = input.awarenessScore ?? 70;

  if (awareness >= 85) {
    return {
      state: "protective",
      presence: 1,
      energy: 0.95,
      intensity: 0.95,
    };
  }

  if (awareness >= 70) {
    return {
      state: "reflective",
      presence: 0.82,
      energy: 0.72,
      intensity: 0.78,
    };
  }

  if (awareness >= 50) {
    return {
      state: "thinking",
      presence: 0.75,
      energy: 0.62,
      intensity: 0.68,
    };
  }

  return {
    state: "calm",
    presence: 0.65,
    energy: 0.42,
    intensity: 0.50,
  };
}