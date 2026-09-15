"use client";

import type { ReactNode } from "react";

export type TwinInsightTone =
  | "neutral"
  | "cyan"
  | "fuchsia"
  | "emerald"
  | "amber"
  | "red";

type Props = {
  eyebrow?: string;
  title: string;
  body: string;

  tone?: TwinInsightTone;

  badge?: ReactNode;
  icon?: ReactNode;

  recommendation?: string;
  footer?: ReactNode;
};

function toneClasses(tone: TwinInsightTone) {
  switch (tone) {
    case "cyan":
      return {
        border: "border-cyan-300/15",
        bg: "bg-cyan-400/[0.035]",
        accent: "text-cyan-100",
        glow: "bg-cyan-400/[0.07]",
      };

    case "fuchsia":
      return {
        border: "border-fuchsia-300/15",
        bg: "bg-fuchsia-400/[0.035]",
        accent: "text-fuchsia-100",
        glow: "bg-fuchsia-400/[0.07]",
      };

    case "emerald":
      return {
        border: "border-emerald-300/15",
        bg: "bg-emerald-400/[0.035]",
        accent: "text-emerald-100",
        glow: "bg-emerald-400/[0.07]",
      };

    case "amber":
      return {
        border: "border-amber-300/18",
        bg: "bg-amber-400/[0.04]",
        accent: "text-amber-100",
        glow: "bg-amber-400/[0.08]",
      };

    case "red":
      return {
        border: "border-red-300/20",
        bg: "bg-red-400/[0.045]",
        accent: "text-red-100",
        glow: "bg-red-400/[0.085]",
      };

    default:
      return {
        border: "border-white/[0.08]",
        bg: "bg-white/[0.02]",
        accent: "text-white",
        glow: "bg-white/[0.035]",
      };
  }
}

export function TwinInsight({
  eyebrow = "TwinMe Insight",
  title,
  body,
  tone = "cyan",
  badge,
  icon,
  recommendation,
  footer,
}: Props) {
  const styles = toneClasses(tone);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.75rem] border p-5 backdrop-blur-xl",
        styles.border,
        styles.bg,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-12 top-1/2 h-32 w-32",
          "-translate-y-1/2 rounded-full blur-[70px]",
          styles.glow,
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {icon ? (
                <span className="text-white/55">
                  {icon}
                </span>
              ) : null}

              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">
                {eyebrow}
              </span>
            </div>

            <h3
              className={[
                "mt-3 text-lg font-black tracking-[-0.02em]",
                styles.accent,
              ].join(" ")}
            >
              {title}
            </h3>

            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/45 sm:text-[13px]">
              {body}
            </p>
          </div>

          {badge ? (
            <div className="shrink-0">
              {badge}
            </div>
          ) : null}
        </div>

        {recommendation ? (
          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-4">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/28">
              TwinMe recommends
            </div>

            <p className="mt-2 text-sm font-semibold leading-6 text-white/82">
              {recommendation}
            </p>
          </div>
        ) : null}

        {footer ? (
          <div className="mt-5 border-t border-white/[0.05] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
