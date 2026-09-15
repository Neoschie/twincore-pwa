"use client";

import type { ReactNode } from "react";

export type TwinTimelineTone =
  | "neutral"
  | "cyan"
  | "fuchsia"
  | "emerald"
  | "amber"
  | "red";

export type TwinTimelineItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: ReactNode;
  tone?: TwinTimelineTone;
};

type Props = {
  eyebrow?: string;
  title?: string;
  badge?: ReactNode;
  items: TwinTimelineItem[];
  emptyText?: string;
};

function toneClasses(tone: TwinTimelineTone) {
  switch (tone) {
    case "cyan":
      return "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.85)]";
    case "fuchsia":
      return "bg-fuchsia-300 shadow-[0_0_10px_rgba(240,171,252,0.85)]";
    case "emerald":
      return "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]";
    case "amber":
      return "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.85)]";
    case "red":
      return "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.9)]";
    default:
      return "bg-white/35";
  }
}

export function TwinTimeline({
  eyebrow = "Timeline",
  title = "Recent activity",
  badge,
  items,
  emptyText = "No recent activity.",
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">
            {eyebrow}
          </div>

          <h3 className="mt-2 text-lg font-black text-white">
            {title}
          </h3>
        </div>

        {badge ? <div>{badge}</div> : null}
      </div>

      <div className="mt-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-5 text-sm text-white/40">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative rounded-2xl border border-white/[0.07] bg-black/10 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="relative mt-1 flex h-7 w-7 shrink-0 items-center justify-center">
                    <span
                      className={[
                        "absolute h-2 w-2 rounded-full",
                        toneClasses(item.tone ?? "neutral"),
                      ].join(" ")}
                    />

                    {item.icon ? (
                      <span className="relative text-white/70">
                        {item.icon}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white/90">
                      {item.title}
                    </div>

                    {item.subtitle ? (
                      <div className="mt-1 text-xs leading-5 text-white/42">
                        {item.subtitle}
                      </div>
                    ) : null}
                  </div>

                  {item.meta ? (
                    <div className="shrink-0 text-[10px] font-semibold text-cyan-200/55">
                      {item.meta}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
