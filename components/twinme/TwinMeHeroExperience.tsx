"use client";

import { PresenceOrb } from "@/components/ui/PresenceOrb";
import { PresenceBadge } from "@/components/ui/PresenceBadge";
type Greeting = {
  greeting: string;
  headline: string;
  body: string;
};

type Props = {
  greeting: Greeting;
  presence: {
    state: "calm" | "reflective" | "thinking" | "protective";
    presence: number;
    energy: number;
    intensity: number;
  };
};

export function TwinMeHeroExperience({ greeting, presence }: Props) {
  return (
    <section className="relative min-h-[640px] overflow-visible px-4 pt-8 pb-10 text-center">
  <div className="relative z-20 mx-auto flex max-w-md items-center justify-between">
  <PresenceBadge
    label="Identity Core"
    color="purple"
    />
  
  <PresenceBadge 
    label="Online"
    color="green"
  />
</div>
        <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-100 backdrop-blur-xl">
          Identity Core
        </div>

        <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100 backdrop-blur-xl">
          Online
        </div>

      <div className="relative z-10 mx-auto mt-8 flex justify-center">
        <PresenceOrb {...presence} size={520} />
      </div>

      <div className="relative z-20 -mt-10 mx-auto max-w-md">
        <p className="text-sm font-semibold text-cyan-200">
          {greeting.greeting}
        </p>

        <h1 className="mt-3 text-5xl font-black tracking-tight text-white">
          {greeting.headline}
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/65">
          {greeting.body}
        </p>
      </div>
    </section>
  );
}