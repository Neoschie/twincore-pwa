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
  syncScore: number;
  statusIcon: React.ReactNode;
};

export function TwinPulseCard({
  name,
  status,
  location,
  connected,
  syncScore,
  statusIcon,
}: Props) {
  return (
    <section className="mb-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.34)]">
        <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/70">
            <Activity className="h-4 w-4 text-cyan-300" />
            Twin Pulse
          </div>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
            Live
          </span>
        </div>

        <h2 className="relative text-3xl font-black tracking-tight text-white">
          {syncScore}% Synced
        </h2>

        <p className="mt-1 text-sm text-white/50">
          Your ecosystem is stable.
        </p>

        <div className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-white/55">
              {statusIcon}
              Status
            </div>

            <div className="font-bold text-white">
              {status || "Not active"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-white/55">
              <MapPin className="h-4 w-4 text-blue-400" />
              Location
            </div>

            <div className="font-bold text-white">
              {location ? "On" : "Off"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-white/55">
              <Users className="h-4 w-4 text-fuchsia-300" />
              Crew
            </div>

            <div className="font-bold text-white">
              {connected} Connected
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-white/55">
              <Brain className="h-4 w-4 text-cyan-300" />
              TwinMe
            </div>

            <div className="font-bold text-white">
              Active
            </div>
          </div>
        </div>

        <p className="relative mt-5 text-sm leading-6 text-white/60">
          TwinCore is monitoring {name}&apos;s ecosystem in real time.
        </p>
      </div>
    </section>
  );
}