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
    <section className="relative min-h-[620px] overflow-visible rounded-[2rem] px-4 pt-5 pb-8">
      <div className="relative z-20 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-100 backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300 animate-pulse" />
          Identity Core
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100 backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
          Online
        </div>
      </div>

      <div className="relative z-20 mt-7">
        <h1 className="text-5xl font-black tracking-tight text-white">
          TwinMe
        </h1>

        <p className="mt-3 text-sm font-semibold text-cyan-200">
          Good evening, {displayName}.
        </p>

        <p className="mt-3 max-w-[16rem] text-sm leading-7 text-white/65">
          TwinMe is reading your current state, crew alignment, environment pressure, and learned rhythm.
        </p>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[205px] z-10 h-[560px] w-[560px] -translate-x-1/2 animate-[twinBreath_8s_ease-in-out_infinite]">
        <div className={`absolute inset-10 rounded-full blur-3xl opacity-60 ${orbState.smoke} animate-[twinGlow_6s_ease-in-out_infinite]`} />

        <Image
          src="/brand/twinme-orb.png"
          alt="TwinMe Orb"
          fill
          priority
          className="object-contain select-none drop-shadow-[0_0_95px_rgba(34,211,238,0.55)]"
        />
      </div>

      <div className="relative z-20 mt-[345px] rounded-3xl border border-white/10 bg-black/20 p-4 text-center shadow-[0_0_40px_rgba(217,70,239,0.10)] backdrop-blur-xl">
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
            transform: translateX(-50%) scale(0.985);
            filter: saturate(1);
          }
          50% {
            transform: translateX(-50%) scale(1.035);
            filter: saturate(1.18);
          }
        }

        @keyframes twinGlow {
          0%, 100% {
            opacity: 0.38;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.72;
            transform: scale(1.08);
          }
        }
      `}</style>
    </section>
  );
}