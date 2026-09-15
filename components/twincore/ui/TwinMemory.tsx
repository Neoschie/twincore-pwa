"use client";

import type { ReactNode } from "react";

export type TwinMemoryTone =
  | "neutral"
  | "cyan"
  | "fuchsia"
  | "emerald"
  | "amber"
  | "red";

export type TwinMemoryItem = {
  id: string;
  title: string;
  summary: string;
  confidence?: number;
  meta?: string;
  tone?: TwinMemoryTone;
  icon?: ReactNode;
};

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  items: TwinMemoryItem[];
  emptyText?: string;
};

function toneClasses(tone: TwinMemoryTone) {
  switch (tone) {
    case "cyan":
      return "border-cyan-300/15 bg-cyan-400/[0.04]";
    case "fuchsia":
      return "border-fuchsia-300/15 bg-fuchsia-400/[0.04]";
    case "emerald":
      return "border-emerald-300/15 bg-emerald-400/[0.04]";
    case "amber":
      return "border-amber-300/15 bg-amber-400/[0.04]";
    case "red":
      return "border-red-300/18 bg-red-400/[0.05]";
    default:
      return "border-white/[0.07] bg-white/[0.02]";
  }
}

function confidenceTone(value?: number) {
  if (typeof value !== "number") {
    return "text-white/40";
  }

  if (value >= 85) {
    return "text-emerald-200";
  }

  if (value >= 65) {
    return "text-cyan-200";
  }

  if (value >= 40) {
    return "text-amber-200";
  }

  return "text-red-200";
}

export function TwinMemory({
  eyebrow = "TwinMe Memory",
  title = "Learned memories",
  subtitle = "Learned memories stored on this device for future pattern recognition.",
  badge,
  items,
  emptyText = "No learned memories yet.",
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-fuchsia-300/12 bg-fuchsia-400/[0.025] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-100/45">
            {eyebrow}
          </div>

          <h3 className="mt-2 text-lg font-black text-white">
            {title}
          </h3>

          {subtitle ? (
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/40">
              {subtitle}
            </p>
          ) : null}
        </div>

        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <div className="mt-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-5 text-sm text-white/40">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={[
                  "rounded-2xl border p-4",
                  toneClasses(item.tone ?? "neutral"),
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.icon ? (
                        <span className="text-white/55">
                          {item.icon}
                        </span>
                      ) : null}

                      <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                        Memory
                      </div>
                    </div>

                    <h4 className="mt-2 text-sm font-semibold text-white/92">
                      {item.title}
                    </h4>

                    <p className="mt-2 text-xs leading-5 text-white/45">
                      {item.summary}
                    </p>

                    {item.meta ? (
                      <div className="mt-3 text-[10px] text-white/28">
                        {item.meta}
                      </div>
                    ) : null}
                  </div>

                  {typeof item.confidence === "number" ? (
                    <div className="shrink-0 text-right">
                      <div
                        className={[
                          "text-sm font-black",
                          confidenceTone(item.confidence),
                        ].join(" ")}
                      >
                        {item.confidence}%
                      </div>

                      <div className="mt-1 text-[7px] font-bold uppercase tracking-[0.14em] text-white/25">
                        Confidence
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
