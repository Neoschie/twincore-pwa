import Image from "next/image";

type Props = {
  label?: string;
  status?: string;
};

export function DashboardOrb({
  label = "Twin Pulse",
  status = "Connected • Learning • Growing",
}: Props) {
  return (
    <section className="relative mb-8 flex flex-col items-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] px-6 py-8 text-center shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative h-64 w-64 sm:h-72 sm:w-72">
        <div className="absolute inset-8 animate-pulse rounded-full bg-fuchsia-400/10 blur-3xl" />

        <Image
          src="/brand/twinme-orb.png"
          alt="TwinCore orb"
          fill
          priority
          className="select-none object-contain drop-shadow-[0_0_70px_rgba(34,211,238,0.5)]"
        />
      </div>

      <div className="relative -mt-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
          {label}
        </p>

        <p className="mt-2 text-sm font-semibold text-white/65">
          {status}
        </p>
      </div>
    </section>
  );
}