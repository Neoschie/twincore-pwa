import Link from "next/link";

export default function SafetyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg[[#05060a] text-white">
      {/* TWINCORE_SAFETY_HUB_FOUNDATION_R17_3 */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_50%_8%,rgba(52,211,153,0.12),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(34,211,238,0.06),transparent_24%)]"
      />

      <div className="twincore-safety-content relative mx-auto flex w-full max-w-5xl flex-col px-5 pb-40 pt-8 sm:px-8 sm:pt-12">
        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.85)]" />
            TwinCore • Safety
          </div>

          <div className="relative mt-8 flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-emerald-300/10 bg-emerald-300/[0.025] shadow-[0_0_70px_rgba(52,211,153,0.10)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-emerald-200/10"
            />

            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="relative h-12 w-12 text-emerald-200 sm:h-14 sm:w-14"
            >
              <path
                d="M12 3.2 19 6v5.1c0 4.55-2.72 7.94-7 9.7-4.28-1.76-7-5.15-7-9.7V6l7-2.8Z"
                stroke="currentColor"
                strokeWidth="1.35"
              />
              <path
                d="m8.8 12 2.05 2.05 4.45-4.45"
                stroke="currentColor"
                strokeWidth="1.45"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="mt-7 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            You have options.
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
            Stay connected, check in with your crew, review your live safety
            tools, and get to the right TwinCore action quickly.
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-100/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
            Safety actions remain under your control
          </div>
        </header>

        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                Immediate actions
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white/92 sm:text-2xl">
                Choose what you need right now.
              </h2>
            </div>

            <div className="hidden text-xs text-white/30 sm:block">
              Calm • clear • direct
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/crew"
              className="group relative overflow-hidden rounded-[1.55rem] border border-emerald-300/12 bg-emerald-300/[0.045] p5 transition duration-300 hover:border-emerald-300/25 hover:bg-emerald-300/[0.075]"
            >
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-300/[0.07] blur-3xl"
              />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/70">
                  Check In
                </div>
                <h3 className="mt-3 text-lg font-black">Crew Safety</h3>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  Check in, tell your crew you are heading home, or signal that
                  you need help.
                </p>
                <div className="mt-5 text-sm font-bold text-emerald-200 transition-transform duration-300 group-hover:translate-x-1">
                  Open Crew ‒
                </div>
              </div>
            </Link>

            <Link
              href="/party"
              className="group relative overflow-hidden rounded-[1.55rem] border border-cyan-300/12 bg-cyan-300/[0.04] p-5 transition duration-300 hover:border-cyan-300/25 hover:bg-cyan-300/[0.07]"
            >
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/[0.07] blur-3xl"
              />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
                  Live Awareness
                </div>
                <h3 className="mt-3 text-lg font-black">Party Safety</h3>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  Review Party Mode tracking, current location awareness, and
                  live check-in controls.
                </p>
                <div className="mt-5 text-sm font-bold text-cyan-200 transition-transform duration-300 group-hover:translate-x-1">
                  Open Party →
                </div>
              </div>
            </Link>

            <Link
              href="/contact-card"
              className="group relative overflow-hidden rounded-[1.55rem] border border-amber-300/12 bg-amber-300/[0.04] p-5 transition duration-300 hover:border-amber-300/25 hover:bg-amber-300/[0.07]"
            >
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/[0.07] blur-3xl"
              />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/70">
                  Emergency Contact
                </div>
                <h3 className="mt-3 text-lg font-black">Contact Card</h3>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  Review the emergency-contact information currently available
                  on your TwinCore contact card.
                </p>
                <div className="mt-5 text-sm font-bold text-amber-200 transition-transform duration-300 group-hover:translate-x-1">
                  Review Contact →
                </div>
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-6 border-y border-white/[0.07] py-7 sm:py-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80 shadow-[0_0_10px_rgba(252,211,77,0.55)]" />
                TwinMe • Guardian
              </div>

              <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.025em] text-white/95">
                TwinMe keeps Safety above nightlife optimization.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">
                When TwinCore detects safety-sensitive context, TwinMe can
                prioritize a safer recommendation. Safety actions remain under
                your control.
              </p>
            </div>

            <Link
              href="/twinme"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200/15 bg-amber-200/[0.05] px-5 text-sm font-bold text-amber-100/80 transition hover:border-amber-200/25 hover:bg-amber-200/[0.08] hover:text-amber-50"
            >
              Open TwinMe →
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-[1.45rem] border border-red-300/10 bg-red-300/[0.025] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200/10 bg-red-200/[0.04] text-sm text-red-100/70">
              !
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200/65">
                Emergency
              </div>
              <p className="mt-2 text-sm leading-6 text-white/62">
                TwinCore is not an emergency service. If you are in immediate
                danger, contact local emergency services.
              </p>
            </div>
          </div>
        </section>

        <nav className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 pb-4 text-sm">
          <Link
            href="/"
            className="text-white/40 transition hover:text-white/75"
          >
            Home
          </Link>
          <Link
            href="/crew"
            className="text-white/40 transition hover:text-white/75"
          >
            Crew
          </Link>
          <Link
            href="/party"
            className="text-white/40 transition hover:text-white/75"
          >
            Party
          </Link>
          <Link
            href="/spots"
            className="text-white/40 transition hover:text-white/75"
          >
            Spots
          </Link>
        </nav>
      </div>
    </main>
  );
}
