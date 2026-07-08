import { Brain } from "lucide-react";

type Props = {
  insight: string;
  confidence?: number;
};

export function InsightCard({ insight, confidence = 97 }: Props) {
  return (
    <section className="mb-8">
      <div className="rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-6 shadow-[0_0_45px_rgba(34,211,238,0.12)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Brain className="h-4 w-4" />
            Twin Insight
          </div>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
            {confidence}% Sync
          </span>
        </div>

        <p className="text-base leading-7 text-white/80">
          {insight}
        </p>
      </div>
    </section>
  );
}