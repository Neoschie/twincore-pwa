type Props = {
  displayName: string;
};

export function TwinMeHero({
  displayName,
}: Props) {

  return (

    <>

<div className="rounded-3xl border border-fuchsia-300/15 bg-fuchsia-400/5 p-4">
  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
    Identity Core
  </div>

  <h2 className="mt-3 text-2xl font-black text-white">
    Good evening, {displayName}.
  </h2>

  <p className="mt-2 text-sm leading-6 text-white/70">
    TwinMe is reading your current state, crew alignment,
    environment pressure, and learned rhythm.
  </p>
</div>

    </>

  );

}