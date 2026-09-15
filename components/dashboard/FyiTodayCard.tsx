import {
  ArrowUpRight,
  Brain,
  Sparkles,
} from "lucide-react";

type Props = {
  summary: string;
  category?: string;
  priority?: string;
};

export function FyiTodayCard({
  summary,
  category,
  priority,
}: Props) {
  return (
    <section className="mb-6">
      <div className="twincore-fyi group relative isolate overflow-hidden rounded-[2rem] border border-cyan-300/[0.22] p-[1px] shadow-[0_28px_90px_rgba(0,0,0,0.42),0_0_90px_rgba(34,211,238,0.09)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(34,211,238,0.38),rgba(59,130,246,0.10)_35%,rgba(168,85,247,0.22)_70%,rgba(236,72,153,0.22))] opacity-60" />

        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-[linear-gradient(135deg,rgba(8,25,37,0.98),rgba(8,13,28,0.985)_50%,rgba(25,8,32,0.97))] px-4 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-cyan-400/[0.16] blur-[90px]" />

          <div className="twincore-fyi-ribbon pointer-events-none absolute -right-[8%] top-[14%] h-[72%] w-[56%] opacity-80">
            <div className="twincore-fyi-ribbon-core absolute inset-0" />
            <div className="twincore-fyi-ribbon-glow absolute inset-0" />
          </div>
          <div className="pointer-events-none absolute -bottom-40 left-[18%] h-80 w-80 rounded-full bg-violet-500/[0.12] blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-64 w-64 rounded-full bg-fuchsia-500/[0.10] blur-[90px]" />

          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.20] bg-cyan-300/[0.09] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Powered by TwinMe
                </div>

                <div className="mt-4 flex items-center gap-3 sm:mt-5 sm:gap-3.5">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/[0.16] bg-[linear-gradient(145deg,rgba(34,211,238,0.13),rgba(168,85,247,0.08))] shadow-[0_0_35px_rgba(34,211,238,0.12)]">
                    <Brain className="h-5 w-5 text-cyan-100" />
                  </span>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100/45">
                      Your daily intelligence
                    </p>

                    <h2 className="mt-0.5 bg-gradient-to-r from-white via-cyan-50 to-violet-100 bg-clip-text text-4xl font-black tracking-[-0.055em] text-transparent sm:text-5xl">
                      FYI Today
                    </h2>
                  </div>
                </div>
              </div>

              {priority ? (
                <span className="rounded-full border border-emerald-300/[0.20] bg-emerald-400/[0.09] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.08)]">
                  {priority}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                  Current
                </span>
              )}
            </div>

            <div className="mt-5 rounded-[1.5rem] sm:mt-7 border border-white/[0.07] bg-black/[0.12] p-3.5 backdrop-blur-sm sm:p-5">
              {category ? (
                <div className="mb-2.5 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100/50">
                  {category}
                </div>
              ) : null}

              <p className="max-w-3xl text-[17px] font-semibold leading-7 tracking-[-0.015em] text-white/90 sm:text-xl sm:leading-8">
                {summary}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 sm:mt-5">
              <p className="max-w-xl text-[10px] leading-5 text-white/32">
                TwinMe surfaces what deserves your attention without cluttering your day.
              </p>

              <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/60">
                Live intelligence
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
