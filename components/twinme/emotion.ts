export type TwinEmotion =
  | "celebrating"
  | "overwhelmed"
  | "lonely"
  | "anxious"
  | "happy"
  | "neutral";

export function detectPrimaryEmotion(text: string): TwinEmotion {
  const clean = text.trim().toLowerCase();

  // Celebration
  if (
    clean.includes("good news") ||
    clean.includes("great news") ||
    clean.includes("passed") ||
    clean.includes("promotion") ||
    clean.includes("promoted") ||
    clean.includes("got the job") ||
    clean.includes("i did it") ||
    clean.includes("excited")
  ) {
    return "celebrating";
  }

  // Overwhelmed
  if (
    clean.includes("overwhelmed") ||
    clean.includes("too much") ||
    clean.includes("stressed")
  ) {
    return "overwhelmed";
  }

  // Lonely
  if (
    clean.includes("lonely") ||
    clean.includes("alone")
  ) {
    return "lonely";
  }

  // Anxiety
  if (
    clean.includes("anxious") ||
    clean.includes("nervous") ||
    clean.includes("worried")
  ) {
    return "anxious";
  }

  // Happy
  if (
    clean.includes("happy") ||
    clean.includes("great day") ||
    clean.includes("feeling good")
  ) {
    return "happy";
  }

  return "neutral";
}