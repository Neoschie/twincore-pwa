import Image from "next/image";
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
  const metrics = [
    {
      label: "Status",
      value: status || "Not active",
      icon: statusIcon,
    },
    {
      label: "Location",
      value: location ? "On" : "Off",
      icon: <MapPin className="h-3.5 w-3.5 text-blue-200" />,
    },
    {
      label: "Crew",
      value: `${connected} Connected`,
      icon: <Users className="h-3.5 w-3.5 text-fuchsia-200" />,
    },
    {
      label: "TwinMe",
      value: "Active",
      icon: <Brain className="h-3.5 w-3.5 text-cyan-100" />,
    },
  ];

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-200/[0.13] bg-[linear-gradient(150deg,rgba(10,21,34,0.97),rgba(8,10,20,0.98)_55%,rgba(20,8,27,0.95))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.36),0_0_70px_rgba(34,211,238,0.07)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/[0.12] blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-fuchsia-500/[0.09] blur-[80px]" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/65">
              <Activity className="h-4 w-4 text-cyan-200" />
              Twin Pulse
            </div>

            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
              Live
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4">
            <div className="relative">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.11] blur-[45px]" />

              <div className="relative h-24 w-24">
                <Image
                  src="/brand/twinme-orb.png"
                  alt="TwinCore TwinMe orb"
                  fill
                  sizes="96px"
                  priority
                  className="animate-orb-breathe select-none object-contain drop-shadow-[0_0_32px_rgba(34,211,238,0.40)]"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-end gap-2">
                <div className="text-4xl font-black tracking-[-0.06em] text-white">
                  {syncScore}%
                </div>

                <span className="pb-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/28">
                  Sync
                </span>
              </div>

              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.20em] text-white/30">
                Ecosystem connected
              </p>

              <div className="mt-3 h-1.5 w-full max-w-[150px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
                  style={{ width: `${Math.min(syncScore, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[1.1rem] border border-white/[0.065] bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
                  {metric.icon}
                  {metric.label}
                </div>

                <div className="mt-1 truncate text-[11px] font-bold text-white/78">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 truncate text-center text-[8px] text-white/20">
            Live awareness for {name}&apos;s TwinCore.
          </p>
        </div>
      </div>
    </section>
  );
}
