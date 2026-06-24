import Image from "next/image";

type TwinMeOrbState = {
  label: string;
  smoke: string;
  ring: string;
  text: string;
  insight: string;
  spin: string;
  pulse: string;
  spark: boolean;
  aura?: string;
};

export function TwinMeOrb({ orbState }: { orbState: TwinMeOrbState }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div className={`absolute inset-0 rounded-full blur-3xl opacity-80 ${orbState.smoke} animate-[pulse_6s_ease-in-out_infinite]`} />
        <div className={`absolute -top-2 left-10 h-24 w-10 rounded-full ${orbState.smoke} blur-2xl opacity-60 animate-[spin_22s_linear_infinite]`} />
        <div className={`absolute right-8 top-5 h-28 w-12 rounded-full ${orbState.smoke} blur-2xl opacity-50 animate-[spin_28s_linear_infinite]`} />
        <div className={`absolute bottom-7 left-12 h-20 w-20 rounded-full ${orbState.smoke} blur-3xl opacity-45 animate-[pulse_8s_ease-in-out_infinite]`} />

        {orbState.spark ? (
          <>
            <div className="absolute left-10 top-8 h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
            <div className="absolute right-10 top-16 h-2 w-2 rounded-full bg-cyan-300 animate-ping" />
            <div className="absolute bottom-10 right-14 h-2 w-2 rounded-full bg-fuchsia-300 animate-ping" />
            <div className="absolute left-16 bottom-12 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <div className="absolute right-16 bottom-20 h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
          </>
        ) : null}

        <div className={`absolute inset-2 rounded-full border ${orbState.ring} ${orbState.spin}`} />
        <div className="absolute inset-5 rounded-full border border-cyan-300/25 animate-[spin_36s_linear_infinite]" />
        <div className="absolute inset-8 rounded-full border border-fuchsia-300/25 animate-[spin_18s_linear_infinite]" />
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-fuchsia-400/20 via-cyan-300/20 to-blue-400/20 blur-lg animate-pulse" />

        <div className="absolute -left-4 top-8 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl animate-pulse" />
        <div className="absolute -right-4 top-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl animate-pulse" />
        <div className="absolute bottom-4 h-10 w-32 rounded-full bg-fuchsia-500/20 blur-xl" />

        <Image
          src="/brand/twinme-orb.png"
          alt="TwinMe Orb"
          width={112}
          height={112}
          priority
          className={`relative h-28 w-28 rounded-full object-contain select-none pointer-events-none transition-all duration-1000 ${orbState.aura ?? ""}`}
        />
      </div>

      <div className={`mt-3 text-center text-xs font-bold uppercase tracking-[0.2em] ${orbState.text}`}>
        {orbState.label}
      </div>

      <div className="mt-1 text-center text-xs text-white/50">
        {orbState.insight}
      </div>
    </div>
  );
}