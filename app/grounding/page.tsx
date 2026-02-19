"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  const params = useSearchParams();
  const mode = params.get("mode") ?? "baseline";

  const key = useMemo(() => (CONTENT[mode] ? mode : "baseline"), [mode]);
  const text = CONTENT[key];

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-6">
        <pre className="whitespace-pre-wrap text-base leading-7 opacity-95">
          {text}
        </pre>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => isSupported && speak(text)}
            className="rounded-2xl px-4 py-2 text-sm border border-white/15 hover:border-white/35 transition disabled:opacity-40"
            aria-label="Play audio"
            title="Play audio"
            disabled={!isSupported}
          >
            🔊 Play
          </button>

          <button
            type="button"
            onClick={() => window.speechSynthesis.cancel()}
            className="rounded-2xl px-4 py-2 text-sm border border-white/15 hover:border-white/35 transition"
            aria-label="Stop audio"
            title="Stop audio"
          >
            ⏸ Stop
          </button>

          <Link
            href={`/after?from=${key}`}
            className="rounded-2xl px-4 py-2 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Continue
          </Link>
        </div>

        <p className="text-xs opacity-50">
          For hands-free listening, connect to Bluetooth audio and press Play. Avoid interacting while driving.
        </p>
      </div>
    </main>
  );
}
