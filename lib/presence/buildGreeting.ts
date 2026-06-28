export type GreetingInput = {
  displayName?: string;
  awarenessScore?: number;
};

export type GreetingOutput = {
  greeting: string;
  headline: string;
  body: string;
};

export function buildGreeting(
  input: GreetingInput = {}
): GreetingOutput {
  const name = input.displayName || "there";
  const awareness = input.awarenessScore ?? 70;

  if (awareness >= 85) {
    return {
      greeting: `Good evening, ${name}.`,
      headline: "You're in builder mode.",
      body: "TwinMe notices stronger momentum and clearer alignment in your rhythm.",
    };
  }

  if (awareness >= 70) {
    return {
      greeting: `Good evening, ${name}.`,
      headline: "I'm here.",
      body: "TwinMe is reading your current state, crew alignment, environment pressure, and learned rhythm.",
    };
  }

  if (awareness >= 50) {
    return {
      greeting: `Good evening, ${name}.`,
      headline: "You're processing.",
      body: "TwinMe is giving you space while it watches for clearer signals.",
    };
  }

  return {
    greeting: `Good evening, ${name}.`,
    headline: "Let's slow things down.",
    body: "TwinMe is staying close while your signal settles.",
  };
}