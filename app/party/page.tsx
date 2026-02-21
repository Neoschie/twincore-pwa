<Link
  href="/car"
  className="block text-center rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
>
  Car Mode
</Link>
"use client";

import Link from "next/link";

export default function PartyModePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Party Mode</h1>

        <p className="text-sm opacity-80 leading-6">
          For moments that feel loud, busy, or a little too much.  
          A soft place to land — before, during, or after.
        </p>

        <div className="space-y-3">
          <Link
            href="/grounding?mode=pre"
            className="block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Before I go
          </Link>

          <Link
            href="/grounding?mode=baseline"
            className="block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            I’m in it
          </Link>

          <Link
            href="/grounding?mode=post"
            className="block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            I’m heading out
          </Link>
        </div>

        <p className="text-xs opacity-50 leading-5">
          No advice. No fixing. Just a moment to settle.
        </p>

        <a
          href="/"
          className="inline-block mt-4 text-xs opacity-60 hover:opacity-90 transition"
        >
          Back home
        </a>
      </div>
    </main>
  );
}