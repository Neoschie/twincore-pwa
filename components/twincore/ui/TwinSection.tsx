"use client";

import {
  type ReactNode,
  useState,
} from "react";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;

  defaultOpen?: boolean;

  icon?: ReactNode;
  trailing?: ReactNode;

  children: ReactNode;

  tone?: "neutral" | "cyan" | "fuchsia" | "amber" | "red" | "emerald";
};

function toneClasses(
  tone: NonNullable<Props["tone"]>,
) {
  switch (tone) {
    case "cyan":
      return {
        border: "border-cyan-300/15",
        glow: "from-cyan-300/25",
        dot: "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]",
      };

    case "fuchsia":
      return {
        border: "border-fuchsia-300/15",
        glow: "from-fuchsia-300/25",
        dot: "bg-fuchsia-300 shadow-[0_0_10px_rgba(240,171,252,0.8)]",
      };

    case "amber":
      return {
        border: "border-amber-300/15",
        glow: "from-amber-300/25",
        dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]",
      };

    case "red":
      return {
        border: "border-red-300/15",
        glow: "from-red-300/25",
        dot: "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)]",
      };

    case "emerald":
      return {
        border: "border-emerald-300/15",
        glow: "from-emerald-300/25",
        dot: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]",
      };

    default:
      return {
        border: "border-white/[0.08]",
        glow: "from-white/15",
        dot: "bg-white/40",
      };
  }
}

export function TwinSection({
  title,
  subtitle,
  eyebrow,

  defaultOpen = false,

  icon,
  trailing,

  children,

  tone = "neutral",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const classes = toneClasses(tone);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.6rem] border bg-white/[0.018]",
        "backdrop-blur-xl transition-all duration-300",
        classes.border,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-10 top-0 h-px",
          "bg-gradient-to-r to-transparent",
          classes.glow,
        ].join(" ")}
      />

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon ? (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white/70">
              {icon}
            </div>
          ) : (
            <span
              aria-hidden="true"
              className={[
                "h-2 w-2 shrink-0 rounded-full",
                classes.dot,
              ].join(" ")}
            />
          )}

          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1 text-[8px] font-black uppercase tracking-[0.24em] text-white/30">
                {eyebrow}
              </div>
            ) : null}

            <div className="truncate text-[13px] font-semibold text-white/90 sm:text-sm">
              {title}
            </div>

            {subtitle ? (
              <div className="mt-1 line-clamp-1 text-[10px] leading-5 text-white/35 sm:text-[11px]">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {trailing ? (
            <div className="text-xs text-white/45">
              {trailing}
            </div>
          ) : null}

          <span
            className={[
              "grid h-8 w-8 place-items-center rounded-full",
              "border border-white/[0.07] bg-white/[0.02]",
              "text-sm text-white/35",
              "transition-all duration-300",
              "group-hover:border-white/[0.13] group-hover:text-white/70",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            ↓
          </span>
        </div>
      </button>

      <div
        className={[
          "grid transition-all duration-300 ease-out",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.05] px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
