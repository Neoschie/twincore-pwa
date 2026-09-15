"use client";

import type { ReactNode } from "react";

export type TwinHeroTone =
  | "cyan"
  | "fuchsia"
  | "emerald"
  | "amber"
  | "red"
  | "neutral";

export type TwinHeroBadge = {
  label: string;
  tone?: TwinHeroTone;
  icon?: ReactNode;
};

export type TwinHeroMetric = {
  label: string;
  value: ReactNode;
  tone?: TwinHeroTone;
};

type Props = {
  eyebrow?: string;

  title: ReactNode;
  subtitle?: ReactNode;
  body?: ReactNode;

  tone?: TwinHeroTone;

  presence?: ReactNode;
  orb?: ReactNode;

  badges?: TwinHeroBadge[];
  metrics?: TwinHeroMetric[];

  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;

  footer?: ReactNode;

  compact?: boolean;
};

function toneStyles(tone: TwinHeroTone) {
  switch (tone) {
    case "cyan":
      return {
        border: "border-cyan-300/15",
        aura: "bg-cyan-400/[0.08]",
        line: "via-cyan-200/35",
        text: "text-cyan-100",
        dot: "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]",
      };

    case "fuchsia":
      return {
        border: "border-fuchsia-300/15",
        aura: "bg-fuchsia-400/[0.08]",
        line: "via-fuchsia-200/35",
        text: "text-fuchsia-100",
        dot: "bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.9)]",
      };

    case "emerald":
      return {
        border: "border-emerald-300/15",
        aura: "bg-emerald-400/[0.08]",
        line: "via-emerald-200/35",
        text: "text-emerald-100",
        dot: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]",
      };

    case "amber":
      return {
        border: "border-amber-300/18",
        aura: "bg-amber-400/[0.09]",
        line: "via-amber-200/40",
        text: "text-amber-100",
        dot: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]",
      };

    case "red":
      return {
        border: "border-red-300/20",
        aura: "bg-red-400/[0.09]",
        line: "via-red-200/40",
        text: "text-red-100",
        dot: "bg-red-300 shadow-[0_0_14px_rgba(252,165,165,0.95)]",
      };

    default:
      return {
        border: "border-white/[0.08]",
        aura: "bg-white/[0.035]",
        line: "via-white/20",
        text: "text-white",
        dot: "bg-white/45",
      };
  }
}

function badgeClasses(tone: TwinHeroTone) {
  switch (tone) {
    case "cyan":
      return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";

    case "fuchsia":
      return "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100";

    case "emerald":
      return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";

    case "amber":
      return "border-amber-300/20 bg-amber-300/10 text-amber-100";

    case "red":
      return "border-red-300/25 bg-red-300/10 text-red-100";

    default:
      return "border-white/10 bg-white/[0.05] text-white/65";
  }
}

function metricText(tone: TwinHeroTone) {
  switch (tone) {
    case "cyan":
      return "text-cyan-100";
    case "fuchsia":
      return "text-fuchsia-100";
    case "emerald":
      return "text-emerald-100";
    case "amber":
      return "text-amber-100";
    case "red":
      return "text-red-100";
    default:
      return "text-white";
  }
}

export function TwinHero({
  eyebrow = "TwinMe",

  title,
  subtitle,
  body,

  tone = "cyan",

  presence,
  orb,

  badges = [],
  metrics = [],

  primaryAction,
  secondaryAction,

  footer,

  compact = false,
}: Props) {
  const styles = toneStyles(tone);

  return (
    <section
      className={[
        "relative isolate overflow-hidden rounded-[2.2rem] border",
        "bg-[#080d14]/78 backdrop-blur-2xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_28px_100px_rgba(0,0,0,0.32)]",
        styles.border,
        compact
          ? "px-5 py-6 sm:px-7"
          : "px-5 py-8 sm:px-8 sm:py-10",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-1/2 top-[-9rem] -z-10",
          "h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-[130px]",
          styles.aura,
        ].join(" ")}
      />

      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-12 top-0 h-px",
          "bg-gradient-to-r from-transparent to-transparent",
          styles.line,
        ].join(" ")}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-white/30">
            <span
              aria-hidden="true"
              className={[
                "h-1.5 w-1.5 rounded-full",
                styles.dot,
              ].join(" ")}
            />

            {eyebrow}
          </div>

          {presence ? (
            <div className="shrink-0">
              {presence}
            </div>
          ) : null}
        </div>

        {orb ? (
          <div
            className={[
              "mx-auto flex items-center justify-center",
              compact
                ? "mt-4 min-h-[110px]"
                : "mt-5 min-h-[150px]",
            ].join(" ")}
          >
            {orb}
          </div>
        ) : null}

        <div className={orb ? "mt-3 text-center" : "mt-6 text-center"}>
          <h1
            className={[
              "mx-auto max-w-3xl text-balance font-black",
              "leading-[0.98] tracking-[-0.045em]",
              styles.text,
              compact
                ? "text-[clamp(2rem,6vw,3.4rem)]"
                : "text-[clamp(2.4rem,7vw,4.6rem)]",
            ].join(" ")}
          >
            {title}
          </h1>

          {subtitle ? (
            <div className="mx-auto mt-4 max-w-2xl text-[13px] font-semibold leading-6 text-cyan-100/85 sm:text-sm">
              {subtitle}
            </div>
          ) : null}

          {body ? (
            <div className="mx-auto mt-3 max-w-2xl text-[12px] leading-6 text-white/48 sm:text-[13px]">
              {body}
            </div>
          ) : null}
        </div>

        {badges.length > 0 ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {badges.map((badge, index) => (
              <span
                key={`${badge.label}-${index}`}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border",
                  "px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em]",
                  badgeClasses(badge.tone ?? "neutral"),
                ].join(" ")}
              >
                {badge.icon ? (
                  <span className="shrink-0">
                    {badge.icon}
                  </span>
                ) : null}

                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        {metrics.length > 0 ? (
          <div
            className={[
              "mx-auto mt-6 grid max-w-3xl gap-2",
              metrics.length === 1
                ? "grid-cols-1"
                : metrics.length === 2
                  ? "grid-cols-2"
                  : metrics.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-4",
            ].join(" ")}
          >
            {metrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.025] px-3 py-3 text-center"
              >
                <div
                  className={[
                    "text-lg font-black sm:text-xl",
                    metricText(metric.tone ?? "neutral"),
                  ].join(" ")}
                >
                  {metric.value}
                </div>

                <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {primaryAction || secondaryAction ? (
          <div className="mx-auto mt-6 flex max-w-2xl flex-col justify-center gap-3 sm:flex-row">
            {primaryAction ? (
              <div className="flex-1">
                {primaryAction}
              </div>
            ) : null}

            {secondaryAction ? (
              <div className="flex-1">
                {secondaryAction}
              </div>
            ) : null}
          </div>
        ) : null}

        {footer ? (
          <div className="mx-auto mt-6 max-w-3xl border-t border-white/[0.05] pt-5">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
