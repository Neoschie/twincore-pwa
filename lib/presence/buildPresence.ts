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

export function buildPresence() : PresenceOutput {

  return {

    state: "reflective",

    presence: 0.82,

    energy: 0.68,

    intensity: 0.76,

  };

}