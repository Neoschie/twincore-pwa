"use client";

import HeroHeader from "./components/HeroHeader";
import CrewStrip from "./components/CrewStrip";
import HeroOrb from "./components/HeroOrb";
import PartyBanner from "./components/PartyBanner";
import LiveVitals from "./components/LiveVitals";

type PartyMomentum =
  | "Peak"
  | "Building"
  | "Cooling"
  | "Stable"
  | "Standby";

type PartyPulseHeroProps = {
  score: number;
  label: string;
  momentum: PartyMomentum;
  message: string;
  partyActive: boolean;
  selectedStatus: string | null;
  displayName: string;
  autoTracking: boolean;
  crewCount: number;
  crewMembers: Array<{
    id: string;
    name: string;
  }>;
  isPlaying: boolean;
  audioReady: boolean;
  onToggleAudio: () => void;
  onTogglePartyMode: () => void;
};

export default function PartyPulseHero({
  score,
  label,
  momentum,
  message,
  partyActive,
  selectedStatus,
  displayName,
  autoTracking,
  crewCount,
  crewMembers,
  isPlaying,
  audioReady,
  onTogglePartyMode,
  onToggleAudio,
}: PartyPulseHeroProps) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-fuchsia-400/15 bg-[radial-gradient(circle_at_50%_15%,rgba(126,34,206,0.22),transparent_34%),linear-gradient(180deg,rgba(9,6,20,0.98),rgba(5,4,12,0.98))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative z-10">
        <HeroHeader
          displayName={displayName}
          selectedStatus={selectedStatus}
          partyActive={partyActive}
          crewCount={crewCount}
          isPlaying={isPlaying}
          audioReady={audioReady}
          onToggleAudio={onToggleAudio}
        />

        <CrewStrip
          partyActive={partyActive}
          crewCount={crewCount}
          crewMembers={crewMembers}
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_minmax(300px,1.35fr)_1fr] lg:items-center">
          <LiveVitals
            score={score}
            momentum={momentum}
            autoTracking={autoTracking}
            partyActive={partyActive}
            side="left"
          />

          <HeroOrb
            score={score}
            label={label}
            momentum={momentum}
            message={message}
            partyActive={partyActive}
          />

          <LiveVitals
            score={score}
            momentum={momentum}
            autoTracking={autoTracking}
            partyActive={partyActive}
            side="right"
          />
        </div>

        <PartyBanner
          partyActive={partyActive}
          selectedStatus={selectedStatus}
          onTogglePartyMode={onTogglePartyMode}
        />
      </div>
    </section>
  );
}
