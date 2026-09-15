"use client";

import type { TwinPresentationControllerResult } from "@/lib/twinme/presentation-controller";

type Props = {
  presentation: TwinPresentationControllerResult;
};

export default function TwinMeExperience({
  presentation,
}: Props) {
  const { state, text, visual } = presentation;

  const stateLabel =
    state === "ambient"
      ? "Present"
      : state === "thinking"
      ? "Thinking"
      : state === "listening"
      ? "Listening"
      : state === "speaking"
      ? "Speaking"
      : state === "guardian"
      ? "Guardian"
      : state === "memory"
      ? "Remembering"
      : "Connected";

  return (
    <section
      className={[
        "relative mx-auto max-w-[620px] overflow-hidden px-5 py-4 text-center",
        "transition-all duration-700 sm:px-8",
        visual.showGuardianHalo ? "text-amber-50" : "text-white",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-1/2 top-1/2 h-24 w-[80%]",
          "-translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px]",
          "transition-all duration-700",
          visual.showGuardianHalo
            ? "bg-amber-400/[0.08]"
            : visual.showThinkingGather
            ? "bg-fuchsia-400/[0.07]"
            : visual.showListeningHalo
            ? "bg-cyan-400/[0.07]"
            : visual.showSpeakingPulse
            ? "bg-cyan-300/[0.065]"
            : "bg-cyan-400/[0.025]",
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-3">
          <span
            className={[
              "h-px w-10 bg-gradient-to-r from-transparent",
              visual.showGuardianHalo ? "to-amber-200/30" : "to-cyan-200/20",
            ].join(" ")}
          />

          <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/35">
            <span
              className={[
                "h-1.5 w-1.5 rounded-full transition-all duration-500",
                visual.showGuardianHalo
                  ? "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]"
                  : visual.showThinkingGather
                  ? "animate-pulse bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.9)]"
                  : visual.showListeningHalo
                  ? "animate-pulse bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]"
                  : visual.showSpeakingPulse
                  ? "animate-pulse bg-cyan-200 shadow-[0_0_14px_rgba(165,243,252,0.95)]"
                  : "bg-white/35",
              ].join(" ")}
            />
            {stateLabel}
          </div>

          <span
            className={[
              "h-px w-10 bg-gradient-to-l from-transparent",
              visual.showGuardianHalo ? "to-amber-200/30" : "to-cyan-200/20",
            ].join(" ")}
          />
        </div>

        {text.visible ? (
          <div className="mx-auto mt-4 max-w-lg">
            {text.primary ? (
              <p className="text-balance text-[clamp(1.05rem,3vw,1.4rem)] font-semibold leading-[1.4] tracking-[-0.02em] text-white/92">
                {text.primary}
              </p>
            ) : null}

            {text.secondary ? (
              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-white/38">
                {text.secondary}
              </p>
            ) : null}
          </div>
        ) : state === "thinking" ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-300/70" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/70 [animation-delay:160ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300/70 [animation-delay:320ms]" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
