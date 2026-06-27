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
    <section className="relative overflow-visible rounded-[2rem] border border-cyan-300/15 bg-white/[0.025] p-5 shadow-[0_0_45px_rgba(34,211,238,0.10)] backdrop-blur-xl">
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-100">
          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300 animate-pulse" />
          Identity Core
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
          Online
        </div>
      </div>

      <div className="relative mt-6">
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

      <div className="relative -mx-10 -mt-3 flex justify-center overflow-visible py-3">
  <div className="relative h-[460px] w-[460px] max-w-none animate-[twinBreath_8s_ease-in-out_infinite]">
    <div className={`absolute inset-10 rounded-full blur-3xl opacity-55 ${orbState.smoke} animate-[twinGlow_6s_ease-in-out_infinite]`} />

    <div className="absolute left-14 top-16 h-28 w-28 rounded-full bg-fuchsia-500/20 blur-3xl animate-[twinDriftA_18s_ease-in-out_infinite]" />
    <div className="absolute right-12 top-24 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl animate-[twinDriftB_22s_ease-in-out_infinite]" />

    <Image
      src="/brand/twinme-orb.png"
      alt="TwinMe Orb"
      fill
      priority
      className="object-contain select-none pointer-events-none drop-shadow-[0_0_90px_rgba(34,211,238,0.55)]"
    />
  </div>
</div>

      <div className="relative -mt-8 rounded-3xl border border-white/10 bg-black/25 p-4 text-center backdrop-blur-xl">
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
      transform: scale(0.985);
      filter: saturate(1);
    }
    50% {
      transform: scale(1.035);
      filter: saturate(1.18);
    }
  }

  @keyframes twinGlow {
    0%, 100% {
      opacity: 0.38;
      transform: scale(0.96);
    }
    50% {
      opacity: 0.68;
      transform: scale(1.08);
    }
  }

  @keyframes twinDriftA {
    0%, 100% {
      transform: translate(-8px, 4px) scale(0.95);
      opacity: 0.28;
    }
    50% {
      transform: translate(18px, -14px) scale(1.15);
      opacity: 0.48;
    }
  }

  @keyframes twinDriftB {
    0%, 100% {
      transform: translate(10px, -4px) scale(1);
      opacity: 0.24;
    }
    50% {
      transform: translate(-18px, 16px) scale(1.18);
      opacity: 0.46;
    }
  }
`}</style>

    </section>
  );
}