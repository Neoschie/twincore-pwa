import Image from "next/image";

type TwinMeOrbState = {
  label: string;
  smoke: string;
  text: string;
  insight: string;
};

type Props = {
  displayName: string;
  orbState: TwinMeOrbState;
  greeting: Greeting;
};

type Greeting = {
  greeting: string;
  headline: string;
  body: string;
};

export function TwinMeHeroV2({
  orbState,
  greeting,
}: Props) {
  return (
    <section className="relative min-h-[720px] overflow-hidden">

      {/* Background Glow */}
      <div
        className={`absolute left-1/2 top-44 h-[720px] w-[720px] -translate-x-1/2 rounded-full blur-[140px] opacity-70 ${orbState.smoke}`}
      />

      {/* Identity */}
      <div className="relative z-20 flex justify-center gap-4 pt-6">

        <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-100">
          Identity Core
        </div>

        <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100">
          Online
        </div>

      </div>

      {/* Orb */}
      <div className="relative z-20 mt-8 flex justify-center">

        <div className="relative h-[470px] w-[470px]">

          <Image
            src="/brand/twinme-orb.png"
            alt="TwinMe"
            fill
            priority
            className="object-contain"
          />

        </div>

      </div>

      {/* Greeting */}

      <div className="relative z-20 -mt-10 text-center">

       <p className="text-cyan-200 font-semibold">
          {greeting.greeting}
       </p>

       <h1 className="mt-3 text-5xl font-black text-white">
          {greeting.headline}
       </h1>

        <p className="mx-auto mt-5 max-w-sm text-white/65 leading-7">
           {greeting.body}
        </p>

      </div>

    </section>
  );
}