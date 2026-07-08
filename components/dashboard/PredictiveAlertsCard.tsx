import { Activity, AlertTriangle, Route } from "lucide-react";

type PredictiveSignal = {
  title: string;
  body: string;
  level: "blue" | "orange" | "red";
};

type Props = {
  predictiveSignals: PredictiveSignal[];
};

export function PredictiveAlertsCard({
  predictiveSignals,
}: Props) {
  return (
    <PredictiveAlertsCard
  predictiveSignals={predictiveSignals}
/>
  );
}