"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const BRIDGE_KEY = "twincore_bridge_shown_v1";

function AfterInner() {
  const params = useSearchParams();
  const from = params.get("from") ?? "";

  const isPartyMode = from === "pre" || from === "post";
  const [showBridge, setShowBridge] = useState(false);

  useEffect(() => {
    if (!isPartyMode) return;

    const alreadyShown = localStorage.getItem(BRIDGE_KEY) === "true";
    if (!alreadyShown) {
      setShowBridge(true);
      localStorage.setItem(BRIDGE_KEY, "true");
    }
  }, [isPartyMode]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="h-12" />

        <div className="space-y-3">
          <Link
            href="/second-layer"
            className="inline-block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Stay a little longer
          </Link>
        </div>

     <div className="pt-2 space-y-3">
  <Link
    href="/"
    prefetch={false}
    className="inline-block rounded-2xl px-6 py-3 text-sm border border-white/15 hover:border-white/35 transition"
  >
    Home
  </Link>

  <button
    type="button"
    onClick={() => (window.location.href = "/")}
    className="text-xs opacity-40 hover:opacity-70 transition"
  >
    If Home doesn’t open, tap here
  </button>
</div>
      </div>

      {showBridge && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-black/60 backdrop-blur p-6 text-center space-y-4">
            <p className="text-sm opacity-90">
              The same presence you used tonight is here for everyday moments too.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowBridge(false)}
                className="rounded-2xl px-4 py-2 text-sm border border-white/15 hover:border-white/35 transition"
              >
                Close
              </button>

              <Link
  href="/"
  prefetch={false}
  className="rounded-2xl px-4 py-2 text-sm border border-white/15 hover:border-white/35 transition"
>
  See everyday TwinCore™
</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AfterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-6" />
      }
    >
      <AfterInner />
    </Suspense>
  );
}