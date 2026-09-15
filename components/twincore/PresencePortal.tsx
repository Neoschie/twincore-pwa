"use client";

import { useTwinCorePresence } from "./PresenceProvider";

export function PresencePortal() {
  const presence = useTwinCorePresence();

  if (!presence.message) {
    return null;
  }

  return (
    <div
      data-presence-mode={presence.mode}
      className="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4"
    >
      <div className="max-w-lg rounded-full border border-white/10 bg-black/55 px-5 py-3 text-center text-sm text-white/85 shadow-2xl backdrop-blur-2xl">
        {presence.message}
      </div>
    </div>
  );
}
