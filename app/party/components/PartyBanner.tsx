"use client";

import { Bolt, ChevronRight } from "lucide-react";

type Props = {
  partyActive: boolean;
  selectedStatus: string | null;
  onTogglePartyMode: () => void;
};

export default function PartyBanner({
  partyActive,
  selectedStatus,
  onTogglePartyMode,
}: Props) {
  return (
    <button
      type="button"
      onClick={onTogglePartyMode}
      disabled={!selectedStatus}
      className={`tc-party-banner relative mt-5 grid w-full grid-cols-[56px_1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${
        !selectedStatus
          ? "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
          : partyActive
            ? "border-fuchsia-300/30 bg-[radial-gradient(circle_at_6%_50%,rgba(217,70,239,0.28),transparent_16%),linear-gradient(90deg,rgba(74,17,90,0.88),rgba(13,9,26,0.94)_55%,rgba(4,17,31,0.95))] text-white shadow-[0_0_35px_rgba(217,70,239,0.18)] hover:brightness-110"
            : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
      }`}
    >
      <span className="tc-party-banner__orb grid h-12 w-12 place-items-center rounded-full border border-fuchsia-300/50 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_18px_rgba(217,70,239,0.35)]">
        <Bolt className="h-6 w-6" fill="currentColor" />
      </span>

      <span className="grid gap-1">
        <strong className="text-sm font-black uppercase tracking-[0.08em]">
          {!selectedStatus
            ? "Choose a status first"
            : partyActive
              ? "Party Mode On"
              : "Turn Party Mode On"}
        </strong>
        <small className="text-[10px] text-white/50">
          {partyActive ? "Tap to power down" : "Tap to power up"}
        </small>
      </span>

      <span className="tc-party-banner__wave relative h-10 w-40 overflow-hidden sm:w-56">
        <i />
        <i />
        <i />
        <ChevronRight className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
      </span>
    </button>
  );
}
