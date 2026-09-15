"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";

import { usePresence } from "@/lib/twincore/presence/usePresence";

type PresenceContextValue =
  ReturnType<typeof usePresence>;

const PresenceContext =
  createContext<PresenceContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function PresenceProvider({ children }: Props) {
  const presence = usePresence();

  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
}

export function useTwinCorePresence() {
  const context = useContext(PresenceContext);

  if (!context) {
    throw new Error(
      "useTwinCorePresence must be used inside PresenceProvider",
    );
  }

  return context;
}
