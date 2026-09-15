export type TwinPresenceMode =
  | "ambient"
  | "listening"
  | "thinking"
  | "speaking"
  | "guardian"
  | "memory"
  | "celebrating"
  | "sleeping";

export type TwinPresenceSource =
  | "twinme"
  | "crew"
  | "party"
  | "spots"
  | "safety"
  | "nearby"
  | "system";

export type TwinPresencePriority =
  | "ambient"
  | "normal"
  | "important"
  | "urgent";

export type TwinPresenceEvent = {
  id: string;
  source: TwinPresenceSource;
  mode: TwinPresenceMode;
  priority: TwinPresencePriority;

  message?: string | null;
  secondaryMessage?: string | null;

  createdAt: number;
  expiresAt?: number | null;

  metadata?: Record<string, unknown>;
};

export function createPresenceEvent(
  input: Omit<TwinPresenceEvent, "id" | "createdAt">,
): TwinPresenceEvent {
  return {
    ...input,
    id: `presence-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    createdAt: Date.now(),
  };
}
