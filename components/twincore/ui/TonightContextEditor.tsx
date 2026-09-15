"use client";

import { CalendarDays, Check, Clock3, MapPin, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { type TonightOccasion } from "@/lib/twinme/tonight-context";
import { useTonightContext } from "@/hooks/twinme/useTonightContext";

const OCCASIONS: TonightOccasion[] = [
  "Dinner",
  "Club",
  "Bar / Lounge",
  "Concert",
  "Birthday",
  "Anniversary",
  "Date Night",
  "Graduation",
  "Wedding",
  "House Party",
  "Work Event",
  "Special Event",
  "Other",
];

const DRESS_CODES = [
  "Casual",
  "Smart Casual",
  "Elevated Casual",
  "Cocktail",
  "Nightlife",
  "Formal",
  "Black Tie",
  "Theme / Costume",
];

type Props = {
  compact?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
};

export function TonightContextEditor({
  compact = false,
  onSaved,
  onCancel,
}: Props) {
  const { tonight, updateTonight } = useTonightContext();

  const [occasion, setOccasion] = useState<TonightOccasion | null>(
    tonight.occasion ?? null,
  );

  const [destination, setDestination] = useState(
    tonight.destination ?? tonight.venue ?? "",
  );

  const [dressCode, setDressCode] = useState(tonight.dressCode ?? "");

  const [startTime, setStartTime] = useState(tonight.startTime ?? "");

  const canSave = useMemo(() => {
    return Boolean(
      occasion || destination.trim() || dressCode.trim() || startTime.trim(),
    );
  }, [occasion, destination, dressCode, startTime]);

  const save = () => {
    updateTonight({
      occasion,
      destination: destination.trim() || null,
      venue: destination.trim() || null,
      dressCode: dressCode.trim() || null,
      startTime: startTime.trim() || null,
    });

    onSaved?.();
  };

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.6rem]",
        "border border-cyan-300/15",
        "bg-[linear-gradient(145deg,rgba(5,17,25,0.94),rgba(23,10,29,0.90))]",
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/[0.07] blur-[70px]"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100/45">
              <Sparkles className="h-3 w-3" />
              TwinMe • Tonight Context
            </div>

            <h3 className="mt-2 text-lg font-black tracking-[-0.025em] text-white">
              Where are we going?
            </h3>

            <p className="mt-1 text-[9px] leading-4 text-white/35">
              Give TwinMe the missing context so Fit, Spots and Party can make
              the same move.
            </p>
          </div>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
            <CalendarDays className="h-3 w-3" />
            What's the occasion?
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {OCCASIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setOccasion(item)}
                className={[
                  "rounded-full border px-3 py-2 text-[9px] font-black transition",
                  occasion === item
                    ? "border-fuchsia-300/25 bg-fuchsia-400/[0.08] text-fuchsia-100"
                    : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:text-white/70",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
              <MapPin className="h-3 w-3" />
              Where?
            </div>

            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Venue, restaurant, club, event..."
              className="mt-2 w-full rounded-[1.1rem] border border-white/[0.08] bg-black/20 px-3 py-3 text-[10px] text-white outline-none placeholder:text-white/20 focus:border-cyan-300/25"
            />
          </label>

          <label className="block">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
              <Clock3 className="h-3 w-3" />
              Start time
            </div>

            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="mt-2 w-full rounded-[1.1rem] border border-white/[0.08] bg-black/20 px-3 py-3 text-[10px] text-white outline-none focus:border-cyan-300/25"
            />
          </label>
        </div>

        <div className="mt-5">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
            Dress code
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {DRESS_CODES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDressCode(item)}
                className={[
                  "rounded-full border px-3 py-2 text-[9px] font-black transition",
                  dressCode === item
                    ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100"
                    : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:text-white/70",
                ].join(" ")}
              >
                {item}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setDressCode("")}
              className={[
                "rounded-full border px-3 py-2 text-[9px] font-black transition",
                dressCode === ""
                  ? "border-amber-300/20 bg-amber-400/[0.06] text-amber-100/70"
                  : "border-white/[0.08] bg-white/[0.025] text-white/40",
              ].join(" ")}
            >
              TwinMe verify later
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          className="mt-5 flex w-full items-center justify-between rounded-[1.25rem] border border-cyan-300/18 bg-cyan-400/[0.06] px-4 py-3.5 text-left transition enabled:hover:bg-cyan-400/[0.1] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/35">
              Save to tonight
            </div>

            <div className="mt-1 text-[11px] font-black text-cyan-100">
              Give TwinMe the context
            </div>
          </div>

          <Check className="h-4 w-4 text-cyan-100" />
        </button>
      </div>
    </section>
  );
}
