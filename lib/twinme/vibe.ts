export type TwinVibeDomain =
  | "party"
  | "fit"
  | "food"
  | "event"
  | "spots"
  | "travel"
  | "general";

export type TwinVibeChoice = {
  id: string;
  label: string;
  emoji?: string;
  description?: string;

  /**
   * Lightweight semantic signals for TwinMe.
   * These are CURRENT-MOOD signals, not permanent preferences.
   */
  tags: string[];
};

export type TwinCurrentVibe = {
  domain: TwinVibeDomain;
  choice: TwinVibeChoice;
  selectedAt: number;
  expiresAt: number;
};

export const TWIN_VIBE_PRESETS: Record<
  TwinVibeDomain,
  TwinVibeChoice[]
> = {
  party: [
    {
      id: "we-outside",
      label: "We Outside",
      emoji: "🔥",
      description: "High energy. Make tonight move.",
      tags: ["social", "high-energy", "nightlife", "active"],
    },
    {
      id: "sexy-grown",
      label: "Sexy & Grown",
      emoji: "🥂",
      description: "Elevated, confident and a little dangerous.",
      tags: ["sexy", "elevated", "grown", "nightlife"],
    },
    {
      id: "dance",
      label: "I Need to Dance",
      emoji: "💃",
      description: "Music first. Find the energy.",
      tags: ["dance", "music", "high-energy"],
    },
    {
      id: "chill",
      label: "Keep It Chill",
      emoji: "😌",
      description: "Good people, good atmosphere, no chaos.",
      tags: ["relaxed", "social", "low-pressure"],
    },
    {
      id: "different",
      label: "Something Different",
      emoji: "⚡",
      description: "Take me outside my usual lane.",
      tags: ["explore", "novelty", "stretch"],
    },
    {
      id: "surprise",
      label: "Surprise Me",
      emoji: "✨",
      description: "TwinMe, make the move.",
      tags: ["surprise", "adaptive", "open"],
    },
  ],

  fit: [
    {
      id: "sexy",
      label: "Sexy",
      emoji: "🔥",
      description: "Turn it up without losing me.",
      tags: ["sexy", "confidence"],
    },
    {
      id: "powerful",
      label: "Powerful",
      emoji: "👑",
      description: "I want to walk in and own it.",
      tags: ["power", "confidence", "statement"],
    },
    {
      id: "comfortable",
      label: "Comfortable",
      emoji: "😌",
      description: "I want to feel good all night.",
      tags: ["comfort", "easy", "wearable"],
    },
    {
      id: "elegant",
      label: "Elegant",
      emoji: "✨",
      description: "Clean, elevated and intentional.",
      tags: ["elegant", "elevated", "refined"],
    },
    {
      id: "bold",
      label: "Bold",
      emoji: "😈",
      description: "Push my swag tonight.",
      tags: ["bold", "experimental", "statement"],
    },
    {
      id: "different",
      label: "Something Different",
      emoji: "⚡",
      description: "Keep me recognizable, but surprise me.",
      tags: ["explore", "stretch", "novelty"],
    },
  ],

  food: [
    {
      id: "comfort",
      label: "Comfort Food",
      emoji: "🍝",
      description: "Something warm and satisfying.",
      tags: ["comfort", "hearty"],
    },
    {
      id: "good-good",
      label: "Something Good-Good",
      emoji: "🥩",
      description: "I want the meal to hit.",
      tags: ["indulgent", "quality", "satisfying"],
    },
    {
      id: "light",
      label: "Light & Fresh",
      emoji: "🥗",
      description: "Fresh without feeling heavy.",
      tags: ["light", "fresh"],
    },
    {
      id: "spicy",
      label: "Spicy",
      emoji: "🌶️",
      description: "Give me some heat.",
      tags: ["spicy", "bold"],
    },
    {
      id: "starving",
      label: "I'm Starving",
      emoji: "😂",
      description: "Fast. Filling. Don't overthink it.",
      tags: ["fast", "filling", "urgent"],
    },
    {
      id: "surprise",
      label: "Surprise Me",
      emoji: "✨",
      description: "Use what you know about me.",
      tags: ["surprise", "adaptive", "open"],
    },
  ],

  event: [
    {
      id: "main-character",
      label: "Main Character",
      emoji: "👑",
      description: "I want this one to feel special.",
      tags: ["celebration", "statement", "memorable"],
    },
    {
      id: "intimate",
      label: "Intimate",
      emoji: "🥂",
      description: "Meaningful, smaller and intentional.",
      tags: ["intimate", "meaningful", "calm"],
    },
    {
      id: "wild",
      label: "Wild",
      emoji: "🔥",
      description: "We are not coming to play.",
      tags: ["high-energy", "party", "social"],
    },
    {
      id: "meaningful",
      label: "Meaningful",
      emoji: "❤️",
      description: "Make it personal, not just expensive.",
      tags: ["meaningful", "personal", "memory"],
    },
    {
      id: "escape",
      label: "Escape",
      emoji: "🌴",
      description: "Get me out of the usual environment.",
      tags: ["travel", "escape", "experience"],
    },
    {
      id: "different",
      label: "Completely Different",
      emoji: "⚡",
      description: "Don't give me my usual.",
      tags: ["novelty", "explore", "stretch"],
    },
  ],

  spots: [
    {
      id: "energy",
      label: "Where's the Energy?",
      emoji: "🔥",
      description: "Find somewhere alive.",
      tags: ["busy", "social", "high-energy"],
    },
    {
      id: "grown",
      label: "Sexy & Grown",
      emoji: "🥂",
      description: "Elevated atmosphere, grown energy.",
      tags: ["elevated", "nightlife", "grown"],
    },
    {
      id: "dance",
      label: "I Want to Dance",
      emoji: "💃",
      description: "Music and movement matter most.",
      tags: ["dance", "music"],
    },
    {
      id: "chill",
      label: "Somewhere Chill",
      emoji: "😌",
      description: "Good atmosphere without the madness.",
      tags: ["relaxed", "social"],
    },
    {
      id: "food",
      label: "Food First",
      emoji: "🍽️",
      description: "Start with something good to eat.",
      tags: ["food", "dining"],
    },
    {
      id: "surprise",
      label: "Surprise Me",
      emoji: "✨",
      description: "TwinMe, pick the move.",
      tags: ["surprise", "adaptive"],
    },
  ],

  travel: [
    {
      id: "relax",
      label: "I Need to Relax",
      emoji: "🌴",
      description: "Low stress. Maximum reset.",
      tags: ["relaxation", "slow", "rest"],
    },
    {
      id: "romantic",
      label: "Romantic",
      emoji: "❤️",
      description: "Build the experience around us.",
      tags: ["romantic", "couples", "experience"],
    },
    {
      id: "adventure",
      label: "Adventure",
      emoji: "⚡",
      description: "I want stories when I come back.",
      tags: ["adventure", "active", "explore"],
    },
    {
      id: "luxury",
      label: "Treat Me",
      emoji: "✨",
      description: "Turn it up.",
      tags: ["luxury", "premium"],
    },
    {
      id: "budget",
      label: "Make the Money Stretch",
      emoji: "💸",
      description: "Maximum experience for the budget.",
      tags: ["budget", "value"],
    },
    {
      id: "different",
      label: "Somewhere Different",
      emoji: "🌍",
      description: "Get me outside my usual.",
      tags: ["novelty", "explore"],
    },
  ],

  general: [
    {
      id: "high-energy",
      label: "High Energy",
      emoji: "🔥",
      tags: ["high-energy"],
    },
    {
      id: "chill",
      label: "Chill",
      emoji: "😌",
      tags: ["relaxed"],
    },
    {
      id: "focused",
      label: "Focused",
      emoji: "🎯",
      tags: ["focused"],
    },
    {
      id: "social",
      label: "Social",
      emoji: "👥",
      tags: ["social"],
    },
    {
      id: "different",
      label: "Something Different",
      emoji: "⚡",
      tags: ["novelty"],
    },
    {
      id: "surprise",
      label: "Surprise Me",
      emoji: "✨",
      tags: ["surprise", "adaptive"],
    },
  ],
};

export function getTwinVibeChoices(
  domain: TwinVibeDomain,
): TwinVibeChoice[] {
  return TWIN_VIBE_PRESETS[domain];
}

export function createCurrentVibe(
  domain: TwinVibeDomain,
  choice: TwinVibeChoice,
  ttlHours = 12,
): TwinCurrentVibe {
  const selectedAt = Date.now();

  return {
    domain,
    choice,
    selectedAt,
    expiresAt: selectedAt + ttlHours * 60 * 60 * 1000,
  };
}

export function isCurrentVibeExpired(
  vibe: TwinCurrentVibe,
): boolean {
  return Date.now() >= vibe.expiresAt;
}
