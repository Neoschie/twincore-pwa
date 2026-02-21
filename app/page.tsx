"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">TwinCore™</h1>
        <p className="text-sm opacity-70">v1 — Foundational Release</p>

        <div className="space-y-3">
          <Link
            href="/grounding?mode=baseline"
            className="block text-center rounded-2xl px-6 py-4 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Begin
          </Link>

          <Link
            href="/party"
            className="block text-center rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Party Mode
          </Link>

          <div className="flex gap-3">
            <Link
              href="/grounding?mode=pre"
              className="flex-1 text-center rounded-2xl px-4 py-3 text-sm border border-white/15 hover:border-white/35 transition"
            >
              Before something
            </Link>

            <Link
              href="/grounding?mode=post"
              className="flex-1 text-center rounded-2xl px-4 py-3 text-sm border border-white/15 hover:border-white/35 transition"
            >
              After something
            </Link>
          </div>
        </div>

        <p className="text-xs opacity-50 leading-5 text-center">
          TwinCore™ offers grounding and presence. It is not a medical or
          therapeutic service.
        </p>
      </div>
    </main>
  );
}