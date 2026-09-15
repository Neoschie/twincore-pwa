"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const PARTY_COPY: Record<string, string> = {
  before: `You’re here.
Nothing needs to be decided right now.
There’s no need to be anywhere else yet.
Notice where you are.
Feel your body where you’re standing or sitting.
Let your breath find its own pace.
You don’t need to prepare anything in this moment.
You don’t need to sort anything out.
This pause is enough for now.
I’m here with you while things settle.`,

  in: `You’re here.
Nothing needs to be decided right now.
Just take a moment with me.
Notice where you are.
Feel your body where you’re sitting or standing.
Let your breath slow on its own.
You don’t need to explain anything.
You don’t need to fix anything.
This is just a pause.
I’m here with you while things settle.`,

  out: `You’re here.
Nothing needs to be revisited right now.
This moment can slow down.
Notice where you are.
Feel the parts of your body that are resting or supported.
Let your breath ease without effort.
You don’t need to replay anything.
You don’t need to hold onto anything.
This is a place to settle.
I’m here with you while things soften.`,
};

function speak(text: string, onEnd?: () => void) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.0;
  utter.onend = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}

export default function CarClient({ flow, stage }: { flow: string; stage: string }) {
  const [isSupported, setIsSupported] = useState(false);
  const lastSpokenRef = useRef<string>("");

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
  }, []);

  const text = useMemo(() => {
    if (flow !== "party") return "";
    if (stage === "before") return PARTY_COPY.before;
    if (stage === "in") return PARTY_COPY.in;
    if (stage === "out") return PARTY_COPY.out;
    return "";
  }, [flow, stage]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b14] px-5 py-10 text-white sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(34,211,238,0.11), transparent 30%), radial-gradient(circle at 78% 74%, rgba(59,130,246,0.08), transparent 34%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center justify-center">
        {stage === "menu" ? (
          <section className="w-full rounded-[2rem] border border-cyan-300/15 bg-white/[0.035] p-7 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
              TwinCore • Car Mode
            </div>

            <div className="mt-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/60">
                Hands-free support
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Take TwinCore with you.
              </h1>

              <p className="mt-5 text-sm leading-7 text-white/55">
                Big controls. Hands-free friendly. Audio will route through Bluetooth / in-car speakers when connected.
              </p>
            </div>

            <div className="mt-9 grid gap-3 lg:grid-cols-3">
              <Link
                href="/car?flow=party&stage=before"
                className="group rounded-[1.5rem] border border-cyan-300/25 bg-cyan-300/[0.08] p-6 transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13]"
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/60">
                  Before
                </span>

                <span className="mt-4 block text-xl font-semibold">
                  Before I go
                </span>

                <span className="mt-2 block text-sm leading-6 text-white/40">
                  Arrive before the night begins.
                </span>

                <span className="mt-6 block text-right text-cyan-100/50 transition group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/car?flow=party&stage=in"
                className="group rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-300/30 hover:bg-white/[0.045]"
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                  Present
                </span>

                <span className="mt-4 block text-xl font-semibold">
                  I&apos;m in it
                </span>

                <span className="mt-2 block text-sm leading-6 text-white/40">
                  Take a pause while you&apos;re there.
                </span>

                <span className="mt-6 block text-right text-white/35 transition group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="/car?flow=party&stage=out"
                className="group rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-300/30 hover:bg-white/[0.045]"
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                  Leave
                </span>

                <span className="mt-4 block text-xl font-semibold">
                  I&apos;m heading out
                </span>

                <span className="mt-2 block text-sm leading-6 text-white/40">
                  Let the night begin to settle.
                </span>

                <span className="mt-6 block text-right text-white/35 transition group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <Link
                href="/"
                className="inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/55 transition hover:border-white/25 hover:text-white"
              >
                FYI Today
              </Link>
            </div>
          </section>
        ) : (
          <section className="w-full overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-white/[0.035] shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
              <div className="border-b border-white/10 p-7 sm:p-10 lg:border-b-0 lg:border-r">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  TwinCore • Car Mode
                </div>

                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/60">
                  {stage === "before"
                    ? "Before"
                    : stage === "in"
                      ? "Present"
                      : "Leave"}
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                  {stage === "before"
                    ? "Before I go"
                    : stage === "in"
                      ? "I'm in it"
                      : "I'm heading out"}
                </h1>

                <p className="mt-5 text-sm leading-7 text-white/50">
                  Let TwinCore guide the pause while your attention stays where it needs to be.
                </p>

                <div className="mt-9 rounded-[1.4rem] border border-white/10 bg-black/10 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/30">
                    Audio
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Connect to Bluetooth/in-car audio, then press Play.
                  </p>
                </div>
              </div>

              <div className="p-7 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/60">
                  Listen
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  A moment with TwinCore
                </h2>

                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/15 p-5 sm:p-6">
                  <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-white/70">
                    {text}
                  </pre>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!isSupported}
                    onClick={() => {
                      lastSpokenRef.current = text;
                      speak(text);
                    }}
                    className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.09] px-5 py-4 text-left transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13] disabled:opacity-40"
                  >
                    <span className="block text-lg">🔊</span>
                    <span className="mt-2 block text-sm font-semibold">
                      Play guidance
                    </span>
                    <span className="mt-1 block text-xs text-white/40">
                      Listen hands-free
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.speechSynthesis.cancel()}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 text-left transition hover:border-white/25"
                  >
                    <span className="block text-lg">⏸</span>
                    <span className="mt-2 block text-sm font-semibold">
                      Stop audio
                    </span>
                    <span className="mt-1 block text-xs text-white/40">
                      Return to quiet
                    </span>
                  </button>
                </div>

                <div className="mt-7 border-t border-white/10 pt-6">
                  <Link
                    href="/car"
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-5 py-4 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
                  >
                    <span>Back to Car Mode</span>
                    <span aria-hidden="true">←</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
