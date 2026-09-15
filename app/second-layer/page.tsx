import Link from "next/link";

const SECOND_LAYER = `You can stay with this moment a little longer.
There’s no rush.
Let your shoulders soften if they want to.
Notice one place in your body that feels steady or supported.
You don’t need to name anything.
You don’t need to understand anything.
Just notice what’s still here with you.`;

export default function SecondLayerPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050b14] px-5 py-10 text-white sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(34,211,238,0.09), transparent 28%), radial-gradient(circle at 24% 75%, rgba(59,130,246,0.07), transparent 34%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-cyan-300/15 bg-white/[0.035] p-7 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
            TwinCore • Second Layer
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/60">
              Stay
            </p>

            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              A little quieter.
            </h1>

            <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-7 text-white/60">
              {SECOND_LAYER}
            </pre>
          </div>

          <div className="mt-9 rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/30">
              Notice
            </p>

            <p className="mt-3 text-sm leading-6 text-white/55">
              You don&apos;t need to turn this moment into anything.
              Stay with it, or return when you&apos;re ready.
            </p>
          </div>

          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
            <Link
              href="/after"
              className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 transition hover:border-white/25"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-white/30">
                Return
              </span>

              <span className="mt-2 block text-sm font-semibold">
                Return to silence
              </span>

              <span className="mt-1 block text-xs text-white/40">
                Go back to the After space.
              </span>
            </Link>

            <Link
              href="/"
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] px-5 py-4 transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.13]"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-100/60">
                Continue
              </span>

              <span className="mt-2 block text-sm font-semibold">
                FYI Today
              </span>

              <span className="mt-1 block text-xs text-white/40">
                Return to your TwinCore day.
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
