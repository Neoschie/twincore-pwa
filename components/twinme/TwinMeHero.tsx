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

      <div className="relative -mx-8 -mt-2 flex justify-center overflow-visible py-2">
        <div className="relative h-[430px] w-[430px] max-w-none">
          <div className={`absolute inset-8 rounded-full blur-3xl opacity-50 ${orbState.smoke}`} />

          <Image
            src="/brand/twinme-orb.png"
            alt="TwinMe Orb"
            fill
            priority
            className="object-contain select-none pointer-events-none drop-shadow-[0_0_80px_rgba(34,211,238,0.50)] animate-[pulse_7s_ease-in-out_infinite]"
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
    </section>
  );
}