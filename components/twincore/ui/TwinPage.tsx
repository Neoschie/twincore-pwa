"use client";

import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;

  presence?: ReactNode;
  situation?: ReactNode;
  action?: ReactNode;

  children: ReactNode;

  footer?: ReactNode;

  maxWidth?: "md" | "lg" | "xl";
};

function widthClass(maxWidth: NonNullable<Props["maxWidth"]>) {
  switch (maxWidth) {
    case "md":
      return "max-w-3xl";
    case "xl":
      return "max-w-6xl";
    default:
      return "max-w-5xl";
  }
}

export function TwinPage({
  eyebrow = "TwinCore",
  title,
  subtitle,

  presence,
  situation,
  action,

  children,

  footer,

  maxWidth = "lg",
}: Props) {
  return (
    <main className="relative min-h-screen overflow-x-hidden text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(180deg,#07101a_0%,#090b10_42%,#08090c_100%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-[-10rem] -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-400/[0.055] blur-[150px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-28 top-1/3 -z-10 h-72 w-72 rounded-full bg-fuchsia-400/[0.035] blur-[120px]"
      />

      <div
        className={[
          "relative mx-auto w-full px-4 pb-16 pt-6 sm:px-6 sm:pt-8",
          widthClass(maxWidth),
        ].join(" ")}
      >
        {presence ? (
          <div className="mb-6">
            {presence}
          </div>
        ) : null}

        <header className="mb-6">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-white/28">
            {eyebrow}
          </div>

          <h1 className="mt-2 text-[clamp(2.2rem,6vw,4rem)] font-black leading-none tracking-[-0.045em] text-white">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">
              {subtitle}
            </p>
          ) : null}
        </header>

        {situation ? (
          <div className="mb-3">
            {situation}
          </div>
        ) : null}

        {action ? (
          <div className="mb-6">
            {action}
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/28">
              Details
            </div>

            <div className="mt-1 text-[11px] text-white/35">
              Open only what you need.
            </div>
          </div>

          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200/35">
            TwinCore OS
          </div>
        </div>

        <div className="space-y-3">
          {children}
        </div>

        {footer ? (
          <footer className="mt-8">
            {footer}
          </footer>
        ) : null}
      </div>
    </main>
  );
}
