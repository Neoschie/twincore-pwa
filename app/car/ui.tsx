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
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-6">
        {stage === "menu" ? (
          <>
            <h1 className="text-4xl font-semibold">Car Mode</h1>
            <p className="opacity-70 leading-7">
              Big controls. Hands-free friendly. Audio will route through Bluetooth / in-car speakers when connected.
            </p>

            <div className="space-y-3 pt-2">
              <Link
                href="/car?flow=party&stage=before"
                className="block text-center rounded-2xl px-6 py-4 text-base border border-white/15 hover:border-white/35 transition"
              >
                Before I go
              </Link>

              <Link
                href="/car?flow=party&stage=in"
                className="block text-center rounded-2xl px-6 py-4 text-base border border-white/15 hover:border-white/35 transition"
              >
                I’m in it
              </Link>

              <Link
                href="/car?flow=party&stage=out"
                className="block text-center rounded-2xl px-6 py-4 text-base border border-white/15 hover:border-white/35 transition"
              >
                I’m heading out
              </Link>
            </div>

            <Link href="/" className="inline-block pt-6 text-sm opacity-70 hover:opacity-100">
              Back home
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">Car Mode</h1>

            <pre className="whitespace-pre-wrap text-base leading-7 opacity-95">{text}</pre>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={!isSupported}
                onClick={() => {
                  lastSpokenRef.current = text;
                  speak(text);
                }}
                className="rounded-2xl px-6 py-4 text-base border border-white/15 hover:border-white/35 transition disabled:opacity-40"
              >
                🔊 Play
              </button>

              <button
                type="button"
                onClick={() => window.speechSynthesis.cancel()}
                className="rounded-2xl px-6 py-4 text-base border border-white/15 hover:border-white/35 transition"
              >
                ⏸ Stop
              </button>

              <Link
                href="/car"
                className="col-span-2 text-center rounded-2xl px-6 py-4 text-base border border-white/15 hover:border-white/35 transition"
              >
                Back
              </Link>
            </div>

            <p className="text-xs opacity-50">
              Connect to Bluetooth/in-car audio, then press Play.
            </p>
          </>
        )}
      </div>
    </main>
  );
}