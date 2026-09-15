"use client";

import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "cyan"
  | "fuchsia"
  | "amber"
  | "red"
  | "emerald";

type Props = {
  eyebrow?: string;
  title: string;
  body?: string;

  tone?: Tone;

  icon?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
};

function toneClasses(tone: Tone) {
  switch (tone) {
    case "cyan":
      return {
        border: "border-cyan-300/15",
        glow: "bg-cyan-400/[0.055]",
        line: "via-cyan-200/35",
        accent: "text-cyan-100",
      };

    case "fuchsia":
      return {
        border: "border-fuchsia-300/15",
        glow: "bg-fuchsia-400/[0.055]",
        line: "via-fuchsia-200/35",
        accent: "text-fuchsia-100",
      };

    case "amber":
      return {
        border: "border-amber-300/18",
        glow: "bg-amber-400/[0.06]",
        line: "via-amber-200/40",
        accent: "text-amber-100",
      };

    case "red":
      return {
        border: "border-red-300/18",
        glow: "bg-red-400/[0.06]",
        line: "via-red-200/40",
        accent: "text-red-100",
      };

    case "emerald":
      return {
        border: "border-emerald-300/15",
        glow: "bg-emerald-400/[0.055]",
        line: "via-emerald-200/35",
        accent: "text-emerald-100",
      };

    default:
      return {
        border: "border-white/[0.08]",
        glow: "bg-white/[0.025]",
        line: "via-white/20",
        accent: "text-white",
      };
  }
}

export function TwinSituation({
  eyebrow = "Right now",
  title,
  body,

  tone = "neutral",

  icon,
  badge,
  footer,
}: Props) {
  const classes = toneClasses(tone);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.85rem] border",
        "bg-[#090e15]/72 px-6 py-6 backdrop-blur-2xl sm:px-7 sm:py-7",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_24px_80px_rgba(0,0,0,0.25)]",
        classes.border,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-10 top-0 h-px",
          "bg-gradient-to-r from-transparent to-transparent",
          classes.line,
        ].join(" ")}
      />

      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-10 top-1/2 h-32 w-32",
          "-translate-y-1/2 rounded-full blur-[70px]",
          classes.glow,
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {icon ? (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white/65">
                  {icon}
                </div>
              ) : null}

              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">
                {eyebrow}
              </span>
            </div>

            <h2
              className={[
                "mt-4 text-balance text-[clamp(1.45rem,4vw,2rem)]",
                "font-black leading-[1.08] tracking-[-0.035em]",
                classes.accent,
              ].join(" ")}
            >
              {title}
            </h2>

            {body ? (
              <p className="mt-3 max-w-xl text-[12px] leading-6 text-white/48 sm:text-[13px]">
                {body}
              </p>
            ) : null}
          </div>

          {badge ? (
            <div className="shrink-0">
              {badge}
            </div>
          ) : null}
        </div>

        {footer ? (
          <div className="mt-5 border-t border-white/[0.05] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
