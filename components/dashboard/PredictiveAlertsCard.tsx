import {
  Activity,
  AlertTriangle,
  Route,
  Sparkles,
} from "lucide-react";

interface PredictiveAlertsCardProps {
  predictiveSignals: Array<{
    title: string;
    body: string;
    level: "red" | "orange" | "blue";
  }>;
}

export function PredictiveAlertsCard({
  predictiveSignals,
}: PredictiveAlertsCardProps) {
  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(14,18,29,0.88),rgba(8,11,18,0.94))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-500/[0.07] blur-3xl" />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-violet-100/35">
              Looking ahead
            </p>

            <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-white">
              TwinMe signals
            </h3>
          </div>

          <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-300/[0.12] bg-violet-400/[0.07]">
            <Sparkles className="h-4 w-4 text-violet-200/70" />
          </span>
        </div>

        <div className="relative mt-4 space-y-2.5">
          {predictiveSignals.map((signal, index) => {
            const signalClass =
              signal.level === "red"
                ? "border-red-400/[0.16] bg-red-400/[0.055]"
                : signal.level === "orange"
                  ? "border-orange-300/[0.16] bg-orange-300/[0.05]"
                  : "border-blue-300/[0.13] bg-blue-300/[0.045]";

            const iconClass =
              signal.level === "red"
                ? "text-red-200"
                : signal.level === "orange"
                  ? "text-orange-200"
                  : "text-cyan-200";

            const Icon =
              signal.level === "red"
                ? AlertTriangle
                : signal.level === "orange"
                  ? Route
                  : Activity;

            return (
              <div
                key={`${signal.title}-${index}`}
                className={`rounded-[1.35rem] border p-4 ${signalClass}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.05] bg-white/[0.04]">
                    <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
                  </span>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white/88">
                      {signal.title}
                    </div>

                    <p className="mt-1 text-[10px] leading-5 text-white/38">
                      {signal.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
