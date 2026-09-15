"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CONTENT: Record<string, string> = {
  baseline: `You’re here.
Nothing needs to be decided right now.
Just take a moment with me.
Notice where you are.
Feel your body where you’re sitting or standing.
Let your breath slow on its own.
You don’t need to explain anything.
You don’t need to fix anything.
This is just a pause.
I’m here with you while things settle.`,

  pre: `You’re here.
Nothing needs to be decided right now.
There’s no need to be anywhere else yet.
Notice where you are.
Feel your body where you’re standing or sitting.
Let your breath find its own pace.
You don’t need to prepare anything in this moment.
You don’t need to sort anything out.
This pause is enough for now.
I’m here with you while things settle.`,

  post: `You’re here.
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

function speak(text: string) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.0;
  window.speechSynthesis.speak(utter);
}

export default function GroundingPage() {
  const [mode, setMode] = useState("baseline");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") ?? "baseline";
    setMode(m);
  }, []);

  const key = useMemo(() => (CONTENT[mode] ? mode : "baseline"), [mode]);
  const text = CONTENT[key];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b14] px-5 py-10 text-white sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 28%, rgba(34,211,238,0.12), transparent 32%), radial-gradient(circle at 18% 78%, rgba(59,130,246,0.10), transparent 34%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-white/[0.035] shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-white/10 p-7 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                TwinCore • Grounding
              </div>

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/60">
                  Arrive
                </p>

                <h1 className="mt-3 max-w-sm text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Be here for a moment.
                </h1>

                <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">
                  Nothing to solve. Nothing to perform. Just a quieter place to let the moment settle.
                </p>
              </div>

              <div className="mt-10 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    01 • Arrive
                  </p>
                  <p className="mt-1 text-sm text-white/70">Notice where you are.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    02 • Listen
                  </p>
                  <p className="mt-1 text-sm text-white/70">Let TwinCore guide the pause.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                    03 • Continue
                  </p>
                  <p className="mt-1 text-sm text-white/70">Move on when you are ready.</p>
                </div>
              </div>
            </div>

            <div className="p-7 sm:p-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/60">
                    Listen
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    A moment with TwinMe
                  </h2>
                </div>

                <div className="h-12 w-12 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] shadow-lg shadow-cyan-500/10" />
              </div>

              <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-black/15 p-5 sm:p-6">
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-white/75">
                  {text}
                </pre>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => isSupported && speak(text)}
                  disabled={!isSupported}
                  className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.09] px-5 py-4 text-left transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13] disabled:opacity-40"
                >
                  <span className="block text-lg">🔊</span>
                  <span className="mt-2 block text-sm font-semibold">Play guidance</span>
                  <span className="mt-1 block text-xs text-white/40">Listen hands-free</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.speechSynthesis.cancel()}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 text-left transition hover:border-white/25"
                >
                  <span className="block text-lg">⏸</span>
                  <span className="mt-2 block text-sm font-semibold">Stop audio</span>
                  <span className="mt-1 block text-xs text-white/40">Return to quiet</span>
                </button>
              </div>

              <div className="mt-7 border-t border-white/10 pt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
                  Continue
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/after?from=${key}`}
                    className="flex-1 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] px-5 py-3.5 text-center text-sm font-semibold transition hover:bg-cyan-300/[0.13]"
                  >
                    Continue gently →
                  </Link>

                  <a
                    href="/"
                    className="rounded-2xl border border-white/10 px-5 py-3.5 text-center text-sm text-white/60 transition hover:border-white/25 hover:text-white"
                  >
                    FYI Today
                  </a>
                </div>

                <p className="mt-4 text-xs leading-5 text-white/30">
                  For hands-free listening, connect to Bluetooth audio and press Play.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
