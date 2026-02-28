"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold">TwinCore™</h1>
          <p className="text-sm opacity-70">A quiet place to pause.</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm leading-6 opacity-80">
            A minimalist grounding space for moments that feel loud.
          </p>
          <p className="text-sm leading-6 opacity-70">
            Before something. During something. After something.
          </p>
          <p className="text-sm leading-6 opacity-70">
            Nothing to fix. Nothing to solve.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/grounding?mode=baseline"
            className="block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Begin
          </Link>

          <Link
            href="/party"
            className="block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Party Mode
          </Link>

          <Link
            href="/car"
            className="block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Car Mode
          </Link>
        </div>

        <p className="text-xs opacity-50 leading-5">
          Short grounding moments through text or optional audio. Use it quietly,
          hands-free, or just for a pause.
        </p>

        <p className="text-[11px] opacity-40 leading-5">
          TwinCore is not therapy or medical care. It’s a gentle space to slow
          down when things feel like a lot.
        </p>
      </div>
    </main>
  );
}