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

type Props = {
  displayName: string;
  orbState: TwinMeOrbState;
};

export function TwinMeHero({ displayName, orbState }: Props) {
  return (
    <section className="relative min-h-[680px] overflow-visible px-4 pt-6 pb-8 text-center">
      <div className="relative z-30 mx-auto flex max-w-md items-center justify-between px-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-100 backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300 animate-pulse" />
          Identity Core
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100 backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
          Online
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[95px] z-10 h-[760px] w-[760px] -translate-x-1/2 animate-[twinBreath_9s_ease-in-out_infinite]">
        <div className={`absolute inset-20 rounded-full blur-[120px] opacity-75 ${orbState.smoke} animate-[twinGlow_7s_ease-in-out_infinite]`} />

        <Image
          src="/brand/twinme-orb.png"
          alt="TwinMe Orb"
          fill
          priority
          className="object-contain select-none drop-shadow-[0_0_100px_rgba(34,211,238,0.55)]"
        />
      </div>

      <div className="relative z-30 mx-auto mt-[470px] max-w-md">
        <h1 className="text-5xl font-black tracking-tight text-white">
          TwinMe
        </h1>

        <p className="mt-3 text-sm font-semibold text-cyan-200">
          Good evening, {displayName}.
        </p>

        <p className="mx-auto mt-3 max-w-[22rem] text-sm leading-7 text-white/65">
          TwinMe is reading your current state, crew alignment, environment pressure, and learned rhythm.
        </p>
      </div>

      <div className="relative z-30 mx-auto mt-6 max-w-md rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 text-center shadow-[0_0_45px_rgba(217,70,239,0.14)] backdrop-blur-xl">
        <div className={`text-4xl font-black uppercase tracking-[0.18em] ${orbState.text}`}>
          {orbState.label}
        </div>

        <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
          Focused • Online
        </div>

        <p className="mt-3 text-xs leading-5 text-white/55">
          {orbState.insight}
        </p>
      </div>

      <style jsx>{`
        @keyframes twinBreath {
          0%, 100% {
            transform: translateX(-50%) scale(0.975);
            filter: saturate(1);
          }
          50% {
            transform: translateX(-50%) scale(1.045);
            filter: saturate(1.18);
          }
        }

        @keyframes twinGlow {
          0%, 100% {
            opacity: 0.42;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.82;
            transform: scale(1.1);
          }
        }
      `}</style>
    </section>
  );
}