"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  DollarSign,
  Shirt,
  ShoppingBag,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  buildFitIntelligence,
  resolveDressCodeContext,
  resolveTimeWeatherContext,
  resolveFootwearIntelligence,
  type TwinFitResult,
} from "@/lib/twinme/fit-intelligence";
import { useTonightContext } from "@/hooks/twinme/useTonightContext";

type FitMode = "home" | "check" | "build" | "rescue";

type Feeling =
  "Sexy" | "Powerful" | "Comfortable" | "Elegant" | "Bold" | "Different";

const FEELINGS: Feeling[] = [
  "Sexy",
  "Powerful",
  "Comfortable",
  "Elegant",
  "Bold",
  "Different",
];

const BUDGETS = [
  "$0 • Closet only",
  "Under $50",
  "Under $100",
  "Under $200",
  "Flexible",
];

const TIME_WINDOWS = ["30 min", "1 hour", "2 hours", "No rush"];

type Props = {
  currentPartyVibe?: string | null;
};

export function PartyFitIntelligence({ currentPartyVibe }: Props) {
  // TWINCORE_FIT_TONIGHT_CONTEXT_R11_5
  const { tonight, updateTonight } = useTonightContext();

  // TWINCORE_FIT_ENVIRONMENT_READ_R11_9
  const environmentRead = resolveTimeWeatherContext(tonight.weatherSummary);

  const sectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<FitMode>("home");
  const [feeling, setFeeling] = useState<Feeling | null>(null);

  const [budget, setBudget] = useState("$0 • Closet only");

  const [timeWindow, setTimeWindow] = useState("1 hour");

  const [closetFirst, setClosetFirst] = useState(true);

  const [photoName, setPhotoName] = useState<string | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [fitResult, setFitResult] = useState<TwinFitResult | null>(null);

  const [showWhy, setShowWhy] = useState(false);

  const [fitLocked, setFitLocked] = useState(false);

  // TWINCORE_FIT_LOCK_STATE_R12_2
  useEffect(() => {
    setFitLocked(Boolean(tonight.fit?.locked));
  }, [tonight.fit?.locked]);

  // TWINCORE_FOOTWEAR_READ_R12_0
  const footwearRead = resolveFootwearIntelligence({
    desiredFeeling: feeling ?? tonight.desiredFeeling,
    destination: tonight.destination ?? tonight.venue,
    dressCode: tonight.dressCode,
    weatherSummary: tonight.weatherSummary,
    currentVibe: tonight.vibeLabel ?? currentPartyVibe,
  });

  // TWINCORE_CONTEXT_RESOLVER_R11_7
  const [destinationDraft, setDestinationDraft] = useState("");
  const [showDestinationEntry, setShowDestinationEntry] = useState(false);

  const destinationOptions = [
    "Club",
    "Dinner",
    "Lounge",
    "Party",
    "Concert",
    "Date Night",
  ] as const;

  useEffect(() => {
    const handleFitRequest = () => {
      setMode("home");

      window.setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    };

    window.addEventListener("twincore:party-fit-request", handleFitRequest);

    return () => {
      window.removeEventListener(
        "twincore:party-fit-request",
        handleFitRequest,
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const createFitResult = () => {
    if (!feeling || mode === "home") return;

    const result = buildFitIntelligence({
      mode,
      currentVibe: tonight.vibeLabel ?? currentPartyVibe,
      desiredFeeling: feeling,
      photoProvided: Boolean(photoUrl),
      closetFirst,
      budget: budget ?? tonight.budget,
      timeWindow,
      destination: tonight.destination ?? tonight.venue,
      dressCode: tonight.dressCode,
      weatherSummary: tonight.weatherSummary,
    });

    updateTonight({
      budget,
      desiredFeeling: feeling,
      fit: {
        mode,
        locked: false,
        swagMove: result.moveTitle,
      },
    });

    setFitResult(result);
    setShowWhy(false);
    setFitLocked(false);
  };

  const resolveDestination = (destination: string) => {
    const cleanDestination = destination.trim();

    if (!cleanDestination || !feeling || mode === "home") return;

    updateTonight({
      destination: cleanDestination,
    });

    const result = buildFitIntelligence({
      mode,
      currentVibe: tonight.vibeLabel ?? currentPartyVibe,
      desiredFeeling: feeling,
      photoProvided: Boolean(photoUrl),
      closetFirst,
      budget: budget ?? tonight.budget,
      timeWindow,
      destination: cleanDestination,
      dressCode: tonight.dressCode,
      weatherSummary: tonight.weatherSummary,
    });

    setFitResult(result);
    setDestinationDraft("");
    setShowDestinationEntry(false);
    setShowWhy(false);
    setFitLocked(false);
  };

  // TWINCORE_DRESS_CODE_RESOLVER_R11_8
  const resolveDressCode = (dressCode: string) => {
    const cleanDressCode = dressCode.trim();

    if (!cleanDressCode || !feeling || mode === "home") {
      return;
    }

    updateTonight({
      dressCode: cleanDressCode,
    });

    const result = buildFitIntelligence({
      mode,
      currentVibe: tonight.vibeLabel ?? currentPartyVibe,
      desiredFeeling: feeling,
      photoProvided: Boolean(photoUrl),
      closetFirst,
      budget: budget ?? tonight.budget,
      timeWindow,
      destination: tonight.destination ?? tonight.venue,
      dressCode: cleanDressCode,
      weatherSummary: tonight.weatherSummary,
    });

    setFitResult(result);
    setShowWhy(false);
    setFitLocked(false);
  };

  const clearFitResult = () => {
    setFitResult(null);
    setShowWhy(false);
    setFitLocked(false);

    // TWINCORE_FIT_UNLOCK_ON_NEW_MOVE_R12_2
    if (tonight.fit?.locked) {
      updateTonight({
        fit: {
          locked: false,
        },
      });
    }
  };

  // TWINCORE_FIT_LOCK_ACTION_R12_2
  const lockFit = () => {
    if (!fitResult) return;

    setFitLocked(true);

    updateTonight({
      desiredFeeling: feeling ?? tonight.desiredFeeling ?? null,
      fit: {
        mode: mode === "home" ? (tonight.fit?.mode ?? null) : mode,
        locked: true,
        swagMove: fitResult.moveTitle,
      },
    });
  };

  // TWINCORE_FIT_CHANGE_ACTION_R12_2
  const changeLockedFit = () => {
    setFitLocked(false);
    setShowWhy(false);

    updateTonight({
      fit: {
        locked: false,
      },
    });
  };

  const choosePhoto = (file: File | null) => {
    if (!file) return;

    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }

    const nextUrl = URL.createObjectURL(file);

    setPhotoName(file.name);
    setPhotoUrl(nextUrl);
  };

  const reset = () => {
    setMode("home");
    setFeeling(null);
    setBudget("$0 • Closet only");
    setTimeWindow("1 hour");
    setClosetFirst(true);
    setFitResult(null);
    setShowWhy(false);
    setFitLocked(false);
  };

  const modeTitle =
    mode === "check"
      ? "Check what I'm wearing."
      : mode === "build"
        ? "Build me a fit."
        : mode === "rescue"
          ? "I have nothing to wear. 😩"
          : "Get my fit right.";

  const modeBody =
    mode === "check"
      ? "Show TwinMe the fit. We'll evaluate it against YOU and tonight — not generic fashion rules."
      : mode === "build"
        ? "TwinMe starts with your Swag DNA and what you already own before recommending anything new."
        : mode === "rescue"
          ? "Time matters. Budget matters. TwinMe will find the fastest route to getting you ready."
          : "Social media sees your fit. TwinMe knows your swag.";

  return (
    <section ref={sectionRef} id="party-fit-launch" className="scroll-mt-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-fuchsia-300/15 bg-[linear-gradient(145deg,rgba(31,12,32,0.92),rgba(8,14,22,0.96))] p-5 shadow-[0_24px_80px_rgba(217,70,239,0.07)] sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/[0.09] blur-[90px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-cyan-400/[0.06] blur-[90px]"
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-100/45">
                <Sparkles className="h-3 w-3" />
                TwinMe • Fit Intelligence
              </div>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
                {modeTitle}
              </h2>

              <p className="mt-2 max-w-xl text-[11px] leading-5 text-white/42 sm:text-xs">
                {modeBody}
              </p>
            </div>

            {mode !== "home" ? (
              <button
                type="button"
                onClick={reset}
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-[0.14em] text-white/45 transition hover:bg-white/[0.07] hover:text-white/75"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            ) : currentPartyVibe ? (
              <span className="shrink-0 rounded-full border border-fuchsia-200/20 bg-fuchsia-300/[0.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-100/65">
                {currentPartyVibe}
              </span>
            ) : null}
          </div>

          {fitResult ? (
            <div className="mt-5 space-y-4">
              <div className="overflow-hidden rounded-[1.65rem] border border-fuchsia-300/18 bg-[linear-gradient(145deg,rgba(217,70,239,0.07),rgba(34,211,238,0.035))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.22em] text-fuchsia-100/45">
                      TwinMe • Fit Read
                    </div>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-white">
                      {fitLocked ? "Fit locked. 🔥" : fitResult.headline}
                    </h3>

                    <p className="mt-1 max-w-xl text-[10px] leading-5 text-white/38">
                      {fitLocked
                        ? "You're set. TwinMe will carry this direction with the rest of tonight."
                        : fitResult.summary}
                    </p>
                  </div>

                  <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/45">
                    {fitResult.confidence} read
                  </span>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {[
                    fitResult.swagCheck,
                    fitResult.codeCheck,
                    fitResult.comfortCheck,
                  ].map((signal) => (
                    <div
                      key={signal.label}
                      className={[
                        "rounded-[1.2rem] border p-3",
                        signal.state === "strong"
                          ? "border-fuchsia-300/15 bg-fuchsia-400/[0.05]"
                          : signal.state === "ready"
                            ? "border-cyan-300/15 bg-cyan-400/[0.045]"
                            : signal.state === "attention"
                              ? "border-amber-300/15 bg-amber-400/[0.045]"
                              : "border-white/[0.07] bg-white/[0.025]",
                      ].join(" ")}
                    >
                      <div className="text-[7px] font-black uppercase tracking-[0.16em] text-white/25">
                        {signal.label}
                      </div>

                      <div className="mt-1 text-[10px] font-black text-white/75">
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-amber-300/18 bg-amber-400/[0.045] p-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-fuchsia-400/[0.09] blur-[50px]"
                />

                <div className="relative">
                  <div className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                    ⚡ Swag Move
                  </div>

                  <h3 className="mt-2 text-lg font-black tracking-[-0.025em] text-white">
                    {fitResult.moveTitle}
                  </h3>

                  <p className="mt-2 max-w-xl text-[11px] leading-5 text-white/45">
                    {fitResult.moveBody}
                  </p>

                  {fitResult.nextNeed ? (
                    <div className="mt-4 rounded-[1.35rem] border border-cyan-300/12 bg-black/20 p-4">
                      {!tonight.destination && !tonight.venue ? (
                        <div>
                          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100/55">
                            ✦ TwinMe needs one thing
                          </div>

                          <div className="mt-2 text-sm font-black text-white/90">
                            Where are we going tonight?
                          </div>

                          <p className="mt-1 text-[9px] leading-4 text-white/35">
                            Give me the setting and I'll tighten the fit around
                            the night.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {destinationOptions.map((destination) => (
                              <button
                                key={destination}
                                type="button"
                                onClick={() => resolveDestination(destination)}
                                className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[9px] font-black text-white/55 transition hover:border-fuchsia-300/25 hover:bg-fuchsia-400/[0.08] hover:text-white"
                              >
                                {destination}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => setShowDestinationEntry(true)}
                              className="rounded-full border border-fuchsia-300/18 bg-fuchsia-400/[0.06] px-3 py-2 text-[9px] font-black text-fuchsia-100/70 transition hover:bg-fuchsia-400/[0.11]"
                            >
                              Other
                            </button>
                          </div>

                          <div className="mt-4 border-t border-white/[0.06] pt-4">
                            {!showDestinationEntry ? (
                              <button
                                type="button"
                                onClick={() => setShowDestinationEntry(true)}
                                className="text-[9px] font-black text-cyan-100/55 transition hover:text-cyan-100"
                              >
                                Know the place? Enter venue or event →
                              </button>
                            ) : (
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                  value={destinationDraft}
                                  onChange={(event) =>
                                    setDestinationDraft(event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      resolveDestination(destinationDraft);
                                    }
                                  }}
                                  placeholder="Venue, event or destination"
                                  className="min-w-0 flex-1 rounded-[1rem] border border-white/[0.09] bg-black/25 px-4 py-3 text-[10px] font-bold text-white outline-none placeholder:text-white/20 focus:border-cyan-300/25"
                                  autoFocus
                                />

                                <button
                                  type="button"
                                  disabled={!destinationDraft.trim()}
                                  onClick={() =>
                                    resolveDestination(destinationDraft)
                                  }
                                  className="rounded-[1rem] border border-cyan-300/18 bg-cyan-400/[0.07] px-4 py-3 text-[9px] font-black text-cyan-100 transition hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  Tell TwinMe
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : !tonight.dressCode ? (
                        <div>
                          {(() => {
                            const destination =
                              tonight.destination ?? tonight.venue;

                            const dressCodeResolution =
                              resolveDressCodeContext(destination);

                            return (
                              <>
                                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-fuchsia-100/55">
                                  ✦ TwinMe Code Read
                                </div>

                                <div className="mt-2 text-sm font-black text-white/90">
                                  {dressCodeResolution.status === "inferred"
                                    ? `I'm reading this as ${dressCodeResolution.dressCode}.`
                                    : "How dressed-up are we talking?"}
                                </div>

                                <p className="mt-1 max-w-xl text-[9px] leading-4 text-white/35">
                                  {dressCodeResolution.reason}
                                </p>

                                {dressCodeResolution.status === "inferred" ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        resolveDressCode(
                                          dressCodeResolution.dressCode!,
                                        )
                                      }
                                      className="rounded-full border border-fuchsia-300/22 bg-fuchsia-400/[0.09] px-4 py-2 text-[9px] font-black text-fuchsia-100 transition hover:bg-fuchsia-400/[0.15]"
                                    >
                                      Use TwinMe's read
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => resolveDressCode("Casual")}
                                      className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[9px] font-black text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                                    >
                                      More casual
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        resolveDressCode("Dressy / Upscale")
                                      }
                                      className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[9px] font-black text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                                    >
                                      More dressed up
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {dressCodeResolution.options.map(
                                      (option) => (
                                        <button
                                          key={option}
                                          type="button"
                                          onClick={() =>
                                            resolveDressCode(option)
                                          }
                                          className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[9px] font-black text-white/55 transition hover:border-fuchsia-300/25 hover:bg-fuchsia-400/[0.08] hover:text-white"
                                        >
                                          {option}
                                        </button>
                                      ),
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        resolveDressCode("TwinMe Best Read")
                                      }
                                      className="rounded-full border border-cyan-300/18 bg-cyan-400/[0.06] px-3 py-2 text-[9px] font-black text-cyan-100/70 transition hover:bg-cyan-400/[0.11]"
                                    >
                                      Not sure • TwinMe decide
                                    </button>
                                  </div>
                                )}

                                <div className="mt-3 text-[8px] font-bold uppercase tracking-[0.16em] text-white/20">
                                  {dressCodeResolution.confidence} context
                                  confidence
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-[9px] leading-4 text-white/35">
                          <span className="font-black text-emerald-200/65">
                            CODE READY •{" "}
                          </span>
                          {tonight.dressCode}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {showWhy ? (
                <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                    Why this move
                  </div>

                  <div className="mt-3 space-y-2">
                    {fitResult.why.map((reason, index) => (
                      <div
                        key={`${reason}-${index}`}
                        className="flex gap-3 text-[9px] leading-5 text-white/40"
                      >
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-fuchsia-300" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setShowWhy((value) => !value)}
                  className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[9px] font-black text-white/55 transition hover:bg-white/[0.05]"
                >
                  {showWhy ? "Hide why" : "Why this move?"}
                </button>

                <button
                  type="button"
                  onClick={clearFitResult}
                  className="rounded-[1.25rem] border border-cyan-300/12 bg-cyan-400/[0.035] px-4 py-3 text-[9px] font-black text-cyan-100/65 transition hover:bg-cyan-400/[0.07]"
                >
                  Try another move
                </button>

                <button
                  type="button"
                  onClick={fitLocked ? changeLockedFit : lockFit}
                  className={[
                    "rounded-[1.25rem] border px-4 py-3 text-[9px] font-black transition",
                    fitLocked
                      ? "border-emerald-300/25 bg-emerald-400/[0.10] text-emerald-100"
                      : "border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-100 hover:bg-fuchsia-400/[0.13]",
                  ].join(" ")}
                >
                  {fitLocked ? "Change Fit" : "Lock Fit 🔥"}
                </button>
              </div>

              {/* TWINCORE_THE_DROP_R12_3 */}
              {fitLocked ? (
                <div className="relative overflow-hidden rounded-[1.85rem] border border-fuchsia-300/25 bg-[linear-gradient(145deg,rgba(217,70,239,0.12),rgba(245,158,11,0.055),rgba(34,211,238,0.06))] p-5 shadow-[0_24px_90px_rgba(217,70,239,0.10)] sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-400/[0.13] blur-[70px]"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-cyan-400/[0.08] blur-[80px]"
                  />

                  <div className="relative z-10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-[0.26em] text-fuchsia-100/55">
                          ⚡ TwinMe • The Drop
                        </div>

                        <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                          Tonight&apos;s look is handled.
                        </h3>

                        <p className="mt-2 max-w-xl text-[10px] leading-5 text-white/42">
                          TwinMe pulled the night together. Your fit direction
                          is locked — now we keep the rest of the move on your
                          wavelength.
                        </p>
                      </div>

                      <span className="rounded-full border border-emerald-300/25 bg-emerald-400/[0.10] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-100">
                        ✓ Fit Locked
                      </span>
                    </div>

                    {/* TWINCORE_THE_DROP_CONTEXT_R12_3 */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(feeling ?? tonight.desiredFeeling) ? (
                        <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-400/[0.06] px-3 py-2 text-[8px] font-black text-fuchsia-100/75">
                          {feeling ?? tonight.desiredFeeling}
                        </span>
                      ) : null}

                      {(tonight.destination ?? tonight.venue) ? (
                        <span className="rounded-full border border-cyan-300/15 bg-cyan-400/[0.05] px-3 py-2 text-[8px] font-black text-cyan-100/70">
                          {tonight.destination ?? tonight.venue}
                        </span>
                      ) : null}

                      {tonight.dressCode ? (
                        <span className="rounded-full border border-amber-300/15 bg-amber-400/[0.05] px-3 py-2 text-[8px] font-black text-amber-100/70">
                          {tonight.dressCode}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.35rem] border border-white/[0.07] bg-black/20 p-4">
                        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30">
                          ⚡ Swag Move
                        </div>

                        <div className="mt-2 text-sm font-black leading-5 text-white/90">
                          {fitResult.moveTitle}
                        </div>

                        <p className="mt-2 text-[9px] leading-4 text-white/38">
                          {fitResult.moveBody}
                        </p>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/[0.07] bg-black/20 p-4">
                        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30">
                          👟 Footwear Lane
                        </div>

                        <div className="mt-2 text-sm font-black leading-5 text-white/90">
                          {footwearRead.headline}
                        </div>

                        <p className="mt-2 text-[9px] leading-4 text-white/38">
                          {footwearRead.move}
                        </p>
                      </div>
                    </div>

                    {/* TWINCORE_THE_DROP_NEXT_MOVE_R12_3 */}
                    <div className="mt-5 border-t border-white/[0.07] pt-5">
                      <div className="text-[8px] font-black uppercase tracking-[0.22em] text-white/30">
                        TwinMe • Next Move
                      </div>

                      <div className="mt-2 text-base font-black text-white">
                        Fit handled. What&apos;s next?
                      </div>

                      <p className="mt-1 text-[9px] leading-4 text-white/35">
                        Keep tonight moving without starting over.
                      </p>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <a
                          href="/spots"
                          className="rounded-[1.2rem] border border-fuchsia-300/18 bg-fuchsia-400/[0.07] px-4 py-3 text-center text-[9px] font-black text-fuchsia-100 transition hover:bg-fuchsia-400/[0.12]"
                        >
                          Find The Move →
                        </a>

                        <a
                          href="/crew"
                          className="rounded-[1.2rem] border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3 text-center text-[9px] font-black text-cyan-100/75 transition hover:bg-cyan-400/[0.09]"
                        >
                          Check My Crew
                        </a>

                        <button
                          type="button"
                          onClick={changeLockedFit}
                          className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[9px] font-black text-white/50 transition hover:bg-white/[0.05] hover:text-white/75"
                        >
                          Change The Fit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === "home" && !fitResult ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  clearFitResult();
                  setMode("check");
                }}
                className="group min-h-[130px] rounded-[1.45rem] border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-300/25 hover:bg-fuchsia-400/[0.07]"
              >
                <Camera className="h-5 w-5 text-fuchsia-200" />

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                  I already have a look
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  Check My Fit
                </div>

                <p className="mt-2 text-[9px] leading-4 text-white/35">
                  Show TwinMe what you're working with.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearFitResult();
                  setMode("build");
                }}
                className="group min-h-[130px] rounded-[1.45rem] border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-400/[0.06]"
              >
                <Shirt className="h-5 w-5 text-cyan-200" />

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                  Help me create it
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  Build Me A Fit
                </div>

                <p className="mt-2 text-[9px] leading-4 text-white/35">
                  Start with my swag and my closet.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearFitResult();
                  setMode("rescue");
                }}
                className="group min-h-[130px] rounded-[1.45rem] border border-fuchsia-300/15 bg-fuchsia-400/[0.045] p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300/25 hover:bg-amber-400/[0.06]"
              >
                <WandSparkles className="h-5 w-5 text-amber-200" />

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.16em] text-amber-100/35">
                  Fit Rescue
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  Nothing To Wear 😩
                </div>

                <p className="mt-2 text-[9px] leading-4 text-white/35">
                  Closet first. Shop only if we need to.
                </p>
              </button>
            </div>
          ) : null}

          {mode === "check" && !fitResult ? (
            <div className="mt-5 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) =>
                  choosePhoto(event.target.files?.[0] ?? null)
                }
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex min-h-[260px] w-full items-center justify-center overflow-hidden rounded-[1.6rem] border border-dashed border-fuchsia-200/20 bg-black/20 transition hover:border-fuchsia-200/35 hover:bg-fuchsia-400/[0.04]"
              >
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt="Fit Check preview"
                      className="absolute inset-0 h-full w-full object-cover opacity-80"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />

                    <div className="relative z-10 mt-auto self-end p-5 text-left">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-100/70">
                        Fit loaded
                      </div>

                      <div className="mt-1 max-w-[250px] truncate text-xs font-bold text-white">
                        {photoName}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-fuchsia-200/20 bg-fuchsia-300/[0.07]">
                      <Camera className="h-5 w-5 text-fuchsia-100" />
                    </div>

                    <div className="mt-4 text-sm font-black text-white">
                      Show TwinMe the fit
                    </div>

                    <div className="mt-1 text-[10px] text-white/35">
                      Take a photo or choose one
                    </div>
                  </div>
                )}
              </button>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  How do you want to feel?
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {FEELINGS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFeeling(item)}
                      className={[
                        "rounded-full border px-3 py-2 text-[9px] font-black transition",
                        feeling === item
                          ? "border-fuchsia-200/30 bg-fuchsia-300/10 text-fuchsia-100"
                          : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:text-white/70",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-cyan-300/10 bg-cyan-400/[0.035] p-4">
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />

                  <div>
                    <div className="text-[10px] font-black text-cyan-100">
                      What TwinMe will check
                    </div>

                    <div className="mt-1 text-[9px] leading-5 text-white/35">
                      Swag DNA • desired feeling • dress code •
                      evening/night/morning • footwear • comfort • weather •
                      crew context
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!photoUrl || !feeling}
                onClick={createFitResult}
                className="w-full rounded-[1.35rem] border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-5 py-4 text-left transition enabled:hover:bg-fuchsia-400/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-fuchsia-100/40">
                  Next
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-black text-fuchsia-100">
                    Find my Swag Move
                  </span>

                  <span>→</span>
                </div>
              </button>
            </div>
          ) : null}

          {mode === "build" && !fitResult ? (
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  How do you want to feel?
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {FEELINGS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFeeling(item)}
                      className={[
                        "rounded-full border px-3 py-2 text-[9px] font-black transition",
                        feeling === item
                          ? "border-fuchsia-200/30 bg-fuchsia-300/10 text-fuchsia-100"
                          : "border-white/[0.08] bg-white/[0.025] text-white/45",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setClosetFirst(true)}
                  className={[
                    "rounded-[1.35rem] border p-4 text-left transition",
                    closetFirst
                      ? "border-cyan-300/25 bg-cyan-400/[0.07]"
                      : "border-white/[0.07] bg-white/[0.025]",
                  ].join(" ")}
                >
                  <Shirt className="h-4 w-4 text-cyan-200" />

                  <div className="mt-3 text-xs font-black text-white">
                    Shop My Closet
                  </div>

                  <div className="mt-1 text-[9px] leading-4 text-white/35">
                    Use what TwinMe remembers first.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setClosetFirst(false)}
                  className={[
                    "rounded-[1.35rem] border p-4 text-left transition",
                    !closetFirst
                      ? "border-fuchsia-300/25 bg-fuchsia-400/[0.07]"
                      : "border-white/[0.07] bg-white/[0.025]",
                  ].join(" ")}
                >
                  <ShoppingBag className="h-4 w-4 text-fuchsia-200" />

                  <div className="mt-3 text-xs font-black text-white">
                    I'm Open To Shopping
                  </div>

                  <div className="mt-1 text-[9px] leading-4 text-white/35">
                    Complete the fit without overspending.
                  </div>
                </button>
              </div>

              {!closetFirst ? (
                <div>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                    <DollarSign className="h-3 w-3" />
                    Budget
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {BUDGETS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setBudget(item)}
                        className={[
                          "rounded-full border px-3 py-2 text-[9px] font-black transition",
                          budget === item
                            ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100"
                            : "border-white/[0.08] bg-white/[0.025] text-white/45",
                        ].join(" ")}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.4rem] border border-cyan-300/12 bg-cyan-400/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />

                  <div>
                    <div className="text-[10px] font-black text-cyan-100">
                      TwinMe starts with YOU
                    </div>

                    <div className="mt-1 text-[9px] leading-5 text-white/35">
                      Swag DNA + current vibe + event + dress code + closet
                      memory + comfort + weather + budget.
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!feeling && !tonight.desiredFeeling}
                onClick={() => {
                  if (!feeling && tonight.desiredFeeling) {
                    setFeeling(tonight.desiredFeeling as Feeling);

                    window.setTimeout(() => {
                      createFitResult();
                    }, 0);

                    return;
                  }

                  createFitResult();
                }}
                className="w-full rounded-[1.35rem] border border-cyan-300/20 bg-cyan-400/[0.07] px-5 py-4 text-left transition enabled:hover:bg-cyan-400/[0.11] disabled:opacity-35"
              >
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/40">
                  Next
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-black text-cyan-100">
                    Build my look
                  </span>
                  <span>→</span>
                </div>
              </button>
            </div>
          ) : null}

          {mode === "rescue" && !fitResult ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-[1.45rem] border border-amber-300/15 bg-amber-400/[0.045] p-4">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/45">
                  TwinMe Rescue
                </div>

                <div className="mt-2 text-sm font-black text-white">
                  First question: do we actually need to spend?
                </div>

                <div className="mt-1 text-[9px] leading-5 text-white/35">
                  TwinMe will try your closet first. If the look is missing
                  something, then we find the smallest, fastest fix.
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  <Clock3 className="h-3 w-3" />
                  How much time do we have?
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {TIME_WINDOWS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTimeWindow(item)}
                      className={[
                        "rounded-full border px-3 py-2 text-[9px] font-black",
                        timeWindow === item
                          ? "border-amber-300/25 bg-amber-400/[0.08] text-amber-100"
                          : "border-white/[0.08] bg-white/[0.025] text-white/45",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  <DollarSign className="h-3 w-3" />
                  What are we spending?
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {BUDGETS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setBudget(item)}
                      className={[
                        "rounded-full border px-3 py-2 text-[9px] font-black",
                        budget === item
                          ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100"
                          : "border-white/[0.08] bg-white/[0.025] text-white/45",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  How do you want to feel?
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {FEELINGS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFeeling(item)}
                      className={[
                        "rounded-full border px-3 py-2 text-[9px] font-black",
                        feeling === item
                          ? "border-fuchsia-300/25 bg-fuchsia-400/[0.08] text-fuchsia-100"
                          : "border-white/[0.08] bg-white/[0.025] text-white/45",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-white/25">
                    Time
                  </div>
                  <div className="mt-1 text-[10px] font-black text-white/70">
                    {timeWindow}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-white/25">
                    Budget
                  </div>
                  <div className="mt-1 text-[10px] font-black text-white/70">
                    {budget}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-white/25">
                    Goal
                  </div>
                  <div className="mt-1 text-[10px] font-black text-white/70">
                    {feeling ?? "Choose"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!feeling}
                onClick={createFitResult}
                className="w-full rounded-[1.35rem] border border-amber-300/20 bg-amber-400/[0.07] px-5 py-4 text-left transition enabled:hover:bg-amber-400/[0.11] disabled:opacity-35"
              >
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/40">
                  Rescue me
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-black text-amber-100">
                    Figure out my fastest fit
                  </span>

                  <span>→</span>
                </div>
              </button>
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-[8px] font-bold uppercase tracking-[0.15em] text-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_10px_rgba(240,171,252,0.8)]" />
            TwinMe doesn't change you to fit the look. The look works for you.
          </div>
        </div>
      </div>
    </section>
  );
}
