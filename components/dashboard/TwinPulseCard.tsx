export function TwinPulseCard() {
  return null;
}

import {
  Activity,
  Brain,
  MapPin,
  Users,
} from "lucide-react";

type Props = {
  name: string;
  status: string | null;
  location: boolean;
  connected: number;
  statusIcon: React.ReactNode;
};

export function TwinPulseCard({
  name,
  status,
  location,
  connected,
  statusIcon,
}: Props) {
  return (
    <section className="mb-8">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.34)]">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Activity className="h-4 w-4" />
          LIVE SYSTEM
        </div>

        <h2 className="text-3xl font-semibold">{name}</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            {statusIcon}
            {status || "Not active"}
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            {location ? "Location On" : "Location Off"}
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-white/70" />
            {connected} Connected
          </div>

          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-white/70" />
            TwinMe Active
          </div>
        </div>

        <p className="mt-4 text-sm text-white/70">
          TwinCore is monitoring your environment in real-time.
        </p>
      </div>
    </section>
  );
}