"use client";

import { Pause, Play, ShieldCheck, Sparkles } from "lucide-react";

type Props = {
  displayName: string;
  selectedStatus: string | null;
  partyActive: boolean;
  crewCount: number;
  isPlaying: boolean;
  audioReady: boolean;
  onToggleAudio: () => void;
};

export default function HeroHeader({
  displayName,
  selectedStatus,
  partyActive,
  crewCount,
  isPlaying,
  audioReady,
  onToggleAudio,
}: Props) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-fuchsia-200">
          <Sparkles className="h-3.5 w-3.5" />
          TwinMe Intelligence
        </div>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {displayName}&apos;s Night
        </h2>

        <p className="mt-1 text-sm text-white/50">
          {selectedStatus || "Choose your current status"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
            partyActive
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-white/10 bg-white/5 text-white/45"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {partyActive ? "Live & Protected" : "Standby"}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-white/55">
          {crewCount} crew signal{crewCount === 1 ? "" : "s"}
        </span>

        <button
          type="button"
          onClick={onToggleAudio}
          disabled={!audioReady}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
            !audioReady
              ? "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
              : isPlaying
                ? "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100 hover:bg-fuchsia-300/15"
                : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
          }`}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {!audioReady ? "Audio unavailable" : isPlaying ? "Pause mix" : "Play mix"}
        </button>
      </div>
    </header>
  );
}
