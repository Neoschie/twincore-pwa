"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Tone =
  | "cyan"
  | "fuchsia"
  | "amber"
  | "red"
  | "emerald"
  | "neutral";

type BaseProps = {
  label: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  tone?: Tone;
  disabled?: boolean;
};

type LinkProps = BaseProps & {
  href: string;
  onClick?: never;
};

type ButtonProps = BaseProps & {
  href?: never;
  onClick: () => void;
};

type Props = LinkProps | ButtonProps;

function toneClasses(tone: Tone) {
  switch (tone) {
    case "cyan":
      return {
        border: "border-cyan-300/20",
        bg: "bg-cyan-400/[0.075]",
        hover: "hover:bg-cyan-400/[0.12] hover:border-cyan-200/30",
        glow: "shadow-[0_18px_60px_rgba(34,211,238,0.08)]",
        accent: "text-cyan-100",
        dot: "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.85)]",
      };

    case "fuchsia":
      return {
        border: "border-fuchsia-300/20",
        bg: "bg-fuchsia-400/[0.075]",
        hover: "hover:bg-fuchsia-400/[0.12] hover:border-fuchsia-200/30",
        glow: "shadow-[0_18px_60px_rgba(217,70,239,0.08)]",
        accent: "text-fuchsia-100",
        dot: "bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.85)]",
      };

    case "amber":
      return {
        border: "border-amber-300/22",
        bg: "bg-amber-400/[0.08]",
        hover: "hover:bg-amber-400/[0.13] hover:border-amber-200/35",
        glow: "shadow-[0_18px_60px_rgba(245,158,11,0.09)]",
        accent: "text-amber-100",
        dot: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.85)]",
      };

    case "red":
      return {
        border: "border-red-300/22",
        bg: "bg-red-400/[0.08]",
        hover: "hover:bg-red-400/[0.13] hover:border-red-200/35",
        glow: "shadow-[0_18px_60px_rgba(239,68,68,0.09)]",
        accent: "text-red-100",
        dot: "bg-red-300 shadow-[0_0_12px_rgba(252,165,165,0.9)]",
      };

    case "emerald":
      return {
        border: "border-emerald-300/20",
        bg: "bg-emerald-400/[0.075]",
        hover: "hover:bg-emerald-400/[0.12] hover:border-emerald-200/30",
        glow: "shadow-[0_18px_60px_rgba(16,185,129,0.08)]",
        accent: "text-emerald-100",
        dot: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.85)]",
      };

    default:
      return {
        border: "border-white/[0.09]",
        bg: "bg-white/[0.025]",
        hover: "hover:bg-white/[0.045] hover:border-white/[0.15]",
        glow: "shadow-[0_18px_60px_rgba(0,0,0,0.18)]",
        accent: "text-white",
        dot: "bg-white/45",
      };
  }
}

export function TwinPrimaryAction(props: Props) {
  const {
    label,
    description,
    eyebrow = "Next step",
    icon,
    trailing,
    tone = "cyan",
    disabled = false,
  } = props;

  const classes = toneClasses(tone);

  const content = (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="relative flex items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-black/15">
          {icon ?? (
            <span className={["h-2 w-2 rounded-full", classes.dot].join(" ")} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black uppercase tracking-[0.24em] text-white/30">
            {eyebrow}
          </div>

          <div
            className={[
              "mt-1 text-[14px] font-bold leading-5 sm:text-[15px]",
              classes.accent,
            ].join(" ")}
          >
            {label}
          </div>

          {description ? (
            <div className="mt-1 text-[10px] leading-5 text-white/38 sm:text-[11px]">
              {description}
            </div>
          ) : null}
        </div>

        <div className="shrink-0">
          {trailing ?? (
            <span className="text-xl text-white/25 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white/65">
              →
            </span>
          )}
        </div>
      </div>
    </>
  );

  const sharedClassName = [
    "group relative block w-full overflow-hidden rounded-[1.6rem] border px-5 py-4 text-left",
    "backdrop-blur-xl transition-all duration-300 active:scale-[0.995]",
    classes.border,
    classes.bg,
    classes.hover,
    classes.glow,
    disabled ? "cursor-not-allowed opacity-40" : "",
  ].join(" ");

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        aria-disabled={disabled}
        className={sharedClassName}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={disabled}
      className={sharedClassName}
    >
      {content}
    </button>
  );
}
