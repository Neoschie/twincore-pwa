"use client";

import {
  MapPin,
  Shirt,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import type { TwinVibeChoice } from "@/lib/twinme/vibe";

type PartyLaunchAction =
  | "fit"
  | "move"
  | "crew"
  | "start";

type Props = {
  vibe?: TwinVibeChoice | null;
  partyActive: boolean;
  crewCount?: number;
  onAction: (action: PartyLaunchAction) => void;
};

const actions = [
  {
    id: "fit" as const,
    eyebrow: "Get Ready",
    title: "Get My Fit Right",
    description:
      "Fit Check, dress code, comfort and your swag.",
    icon: Shirt,
    accent: "fuchsia",
  },
  {
    id: "move" as const,
    eyebrow: "Go Somewhere",
    title: "Find The Move",
    description:
      "Food, spots and experiences that match tonight.",
    icon: MapPin,
    accent: "cyan",
  },
  {
    id: "crew" as const,
    eyebrow: "My People",
    title: "Where's My Crew?",
    description:
      "See who's around and bring the right people together.",
    icon: Users,
    accent: "violet",
  },
  {
    id: "start" as const,
    eyebrow: "I'm Ready",
    title: "Start Party Mode",
    description:
      "Let TwinMe begin reading the night with you.",
    icon: Zap,
    accent: "amber",
  },
];

export function PartyLaunchpad({
  vibe,
  partyActive,
  crewCount = 0,
  onAction,
}: Props) {
  const vibeLabel = vibe?.label ?? "your vibe";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(20,11,28,0.88),rgba(7,14,22,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-fuchsia-500/[0.08] blur-[90px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-cyan-400/[0.07] blur-[90px]"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-100/45">
              <Sparkles className="h-3 w-3" />
              TwinMe • Tonight
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
              {partyActive
                ? "We're live. What's next?"
                : vibe
                  ? "Okayyy. What's the move?"
                  : "What are we doing tonight?"}
            </h2>

            <p className="mt-2 max-w-xl text-[11px] leading-5 text-white/42 sm:text-xs">
              {partyActive
                ? "Party Mode is active. TwinMe will keep the night moving without putting the dashboard in your face."
                : vibe
                  ? `${vibeLabel} is locked for right now. Pick where you want TwinMe to help next.`
                  : "TwinMe can help with the fit, the place, the crew or the whole night."}
            </p>
          </div>

          {vibe ? (
            <div className="shrink-0 rounded-full border border-fuchsia-200/20 bg-fuchsia-300/[0.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-100/70">
              {vibe.emoji ? `${vibe.emoji} ` : ""}
              {vibe.label}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;

            const accentClass =
              action.accent === "fuchsia"
                ? "group-hover:border-fuchsia-300/25 group-hover:bg-fuchsia-400/[0.07]"
                : action.accent === "cyan"
                  ? "group-hover:border-cyan-300/25 group-hover:bg-cyan-400/[0.06]"
                  : action.accent === "violet"
                    ? "group-hover:border-violet-300/25 group-hover:bg-violet-400/[0.06]"
                    : "group-hover:border-amber-300/25 group-hover:bg-amber-400/[0.06]";

            const iconClass =
              action.accent === "fuchsia"
                ? "text-fuchsia-200"
                : action.accent === "cyan"
                  ? "text-cyan-200"
                  : action.accent === "violet"
                    ? "text-violet-200"
                    : "text-amber-200";

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction(action.id)}
                className={[
                  "group relative min-h-[118px] overflow-hidden rounded-[1.4rem]",
                  "border border-white/[0.07] bg-white/[0.025] p-4 text-left",
                  "transition-all duration-300 hover:-translate-y-0.5",
                  accentClass,
                ].join(" ")}
              >
                <div className="flex h-full items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                    <Icon
                      className={`h-4 w-4 ${iconClass}`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                      {action.eyebrow}
                    </div>

                    <div className="mt-1 text-[13px] font-black text-white/90">
                      {action.id === "crew" && crewCount > 0
                        ? `${action.title} · ${crewCount}`
                        : action.title}
                    </div>

                    <div className="mt-1.5 text-[9px] leading-4 text-white/35">
                      {action.id === "start" && partyActive
                        ? "Party Mode is already live. Keep TwinMe with you."
                        : action.description}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-3 right-4 text-sm text-white/20 transition group-hover:translate-x-1 group-hover:text-white/55">
                  →
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[8px] font-bold uppercase tracking-[0.15em] text-white/25">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.7)]" />
          TwinMe uses your swag + right now + tonight
        </div>
      </div>
    </section>
  );
}
