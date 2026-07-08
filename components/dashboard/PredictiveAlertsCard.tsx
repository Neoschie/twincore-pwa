import { AlertTriangle, Route, Activity } from "lucide-react";

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
    <section className="mb-8">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.34)]">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-white/85">
          <AlertTriangle className="h-4 w-4" />
          Predictive Alerts
        </div>

        <div className="space-y-3">
          {predictiveSignals.map((signal, index) => (
            <div
              key={`${signal.title}-${index}`}
              className={`rounded-2xl border p-4 ${
                signal.level === "red"
                  ? "border-red-500/20 bg-red-500/10"
                  : signal.level === "orange"
                    ? "border-orange-500/20 bg-orange-500/10"
                    : "border-blue-500/20 bg-blue-500/10"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                {signal.level === "red" ? (
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                ) : signal.level === "orange" ? (
                  <Route className="h-4 w-4 text-orange-300" />
                ) : (
                  <Activity className="h-4 w-4 text-blue-300" />
                )}

                {signal.title}
              </div>

              <p className="text-sm leading-6 text-white/75">
                {signal.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}