"use client";

import OrbScore from "./OrbScore";
import OrbLightning from "./OrbLightning";
import OrbParticles from "./OrbParticles";
import OrbFlames from "./OrbFlames";
import Image from "next/image";

type PartyMomentum =
  | "Peak"
  | "Building"
  | "Cooling"
  | "Stable"
  | "Standby";

type Props = {
  score: number;
  label: string;
  momentum: PartyMomentum;
  message: string;
  partyActive: boolean;
};

function getIntensity(score: number) {
  if (score >= 85) return "peak";
  if (score >= 65) return "building";
  if (score >= 40) return "watch";
  return "standby";
}

export default function HeroOrb({
  score,
  label,
  momentum,
  message,
  partyActive,
}: Props) {
  
  const intensity = getIntensity(score);

  return (
    <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center">
      <div
        className={`tc-orb tc-orb--${intensity} ${
          partyActive ? "is-active" : "is-paused"
        }`}
        style={{ "--energy": score } as React.CSSProperties}
      >
        <div className="tc-orb__light-spill" />
        <div className="tc-orb__heat" />

  <div className="tc-orb__base">
  <Image
    src="/brand/twinme-orb.png"
    alt=""
    fill
    priority
    className="object-contain"
  />
</div>

 <OrbLightning active={partyActive} />
 <OrbParticles active={partyActive} /> 

  <OrbScore
  score={score}
  label={label}
  momentum={momentum}
/>
      </div>

      <p className="mt-3 max-w-md text-center text-sm leading-6 text-white/60">
        {message}
      </p>
    </div>
  );
}
