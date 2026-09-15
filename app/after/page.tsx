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
    <main className="relative min-h-screen overflow-hidden bg-[#050b14] px-5 py-10 text-white sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(34,211,238,0.10), transparent 30%), radial-gradient(circle at 75% 72%, rgba(59,130,246,0.08), transparent 34%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-cyan-300/15 bg-white/[0.035] p-7 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
            TwinCore • After
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/60">
              Settle
            </p>

            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              You don&apos;t have to rush back.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">
              Stay with the quieter moment for as long as you need, or return to the rest of your day.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <Link
              href="/second-layer"
              className="rounded-[1.4rem] border border-cyan-300/25 bg-cyan-300/[0.08] p-5 transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-100/60">
                Stay
              </p>

              <p className="mt-3 text-lg font-semibold">
                Stay a little longer
              </p>

              <p className="mt-2 text-xs leading-5 text-white/40">
                Continue into a quieter second layer.
              </p>
            </Link>

            <Link
              href="/"
              prefetch={false}
              className="rounded-[1.4rem] border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/25"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                Return
              </p>

              <p className="mt-3 text-lg font-semibold">
                FYI Today
              </p>

              <p className="mt-2 text-xs leading-5 text-white/40">
                Return to your TwinCore day.
              </p>
            </Link>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/30">
                  Your pace
                </p>

                <p className="mt-2 text-sm text-white/55">
                  There&apos;s no required next step.
                </p>
              </div>

              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="text-xs text-white/35 transition hover:text-white/70"
              >
                If FYI Today doesn&apos;t open, tap here
              </button>
            </div>
          </div>
        </section>
      </div>

      {showBridge && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#030812]/70 px-6 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[1.75rem] border border-cyan-300/20 bg-[#091522]/95 p-6 text-center shadow-2xl shadow-cyan-950/30">
            <div className="mx-auto h-11 w-11 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08]" />

            <p className="mt-5 text-lg font-semibold">
              TwinCore stays with you.
            </p>

            <p className="mt-3 text-sm leading-6 text-white/60">
              The same presence you used tonight is here for everyday moments too.
            </p>

            <div className="mt-6 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowBridge(false)}
                className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
              >
                Close
              </button>

              <Link
                href="/"
                prefetch={false}
                className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.09] px-4 py-2.5 text-sm font-semibold transition hover:bg-cyan-300/[0.14]"
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