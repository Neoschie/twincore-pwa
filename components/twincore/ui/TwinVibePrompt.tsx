"use client";

import type {
  TwinVibeChoice,
  TwinVibeDomain,
} from "@/lib/twinme/vibe";

type Props = {
  domain: TwinVibeDomain;
  choices: TwinVibeChoice[];

  selectedId?: string | null;

  eyebrow?: string;
  title?: string;
  body?: string;

  compact?: boolean;

  onSelect: (choice: TwinVibeChoice) => void;
  onClear?: () => void;
};

export function TwinVibePrompt({
  domain,
  choices,
  selectedId,
  eyebrow = "TwinMe • Right Now",
  title = "What are you feeling?",
  body = "Your history matters. Your mood right now matters too.",
  compact = false,
  onSelect,
  onClear,
}: Props) {
  return (
    <section
      data-twin-vibe-domain={domain}
      className={[
        "relative overflow-hidden rounded-[2rem]",
        "border border-fuchsia-300/15",
        "bg-[linear-gradient(145deg,rgba(20,10,31,0.88),rgba(5,12,22,0.94))]",
        "shadow-[0_24px_80px_rgba(0,0,0,0.32)]",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/[0.09] blur-[80px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-cyan-400/[0.07] blur-[80px]"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.26em] text-fuchsia-100/45">
              {eyebrow}
            </div>

            <h2
              className={[
                "mt-3 font-black leading-[1.03] tracking-[-0.035em] text-white",
                compact
                  ? "text-xl sm:text-2xl"
                  : "text-2xl sm:text-3xl",
              ].join(" ")}
            >
              {title}
            </h2>

            {body ? (
              <p className="mt-2 max-w-xl text-[11px] leading-5 text-white/42 sm:text-xs">
                {body}
              </p>
            ) : null}
          </div>

          {selectedId && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/35 transition hover:bg-white/[0.06] hover:text-white/65"
            >
              Change
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {choices.map((choice) => {
            const selected = selectedId === choice.id;

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelect(choice)}
                aria-pressed={selected}
                className={[
                  "group relative min-h-[88px] overflow-hidden rounded-[1.35rem] border p-3 text-left",
                  "transition-all duration-300 active:scale-[0.985]",
                  selected
                    ? "border-fuchsia-200/35 bg-fuchsia-400/[0.12] shadow-[0_12px_35px_rgba(217,70,239,0.12)]"
                    : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.13] hover:bg-white/[0.045]",
                ].join(" ")}
              >
                {selected ? (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-200/70 to-transparent"
                  />
                ) : null}

                <div className="text-lg">
                  {choice.emoji ?? "◎"}
                </div>

                <div
                  className={[
                    "mt-2 text-[11px] font-black leading-4",
                    selected
                      ? "text-fuchsia-100"
                      : "text-white/80",
                  ].join(" ")}
                >
                  {choice.label}
                </div>

                {choice.description ? (
                  <div className="mt-1 text-[9px] leading-4 text-white/32">
                    {choice.description}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {selectedId ? (
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-100/45">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
            TwinMe is using how you feel right now.
          </div>
        ) : null}
      </div>
    </section>
  );
}
