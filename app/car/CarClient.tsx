"use client";

import { useSearchParams } from "next/navigation";

export default function CarClient() {
  const sp = useSearchParams();
  const flow = sp.get("flow") ?? "party";
  const stage = sp.get("stage") ?? "menu";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-5xl font-semibold">Car Mode</h1>
        <p className="opacity-70">flow: {flow} — stage: {stage}</p>
      </div>
    </main>
  );
}