"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PartyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 space-y-6">
      <h1 className="text-4xl font-semibold">Party Mode</h1>

      <Link
        href="/car?flow=party&stage=menu"
        className="inline-block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
      >
        Car Mode
      </Link>

      <Link
        href="/grounding?mode=baseline"
        className="inline-block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
      >
        Grounding
      </Link>

      <Link
        href="/"
        className="inline-block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
      >
        Home
      </Link>
    </main>
  );
}