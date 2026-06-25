type Props = {
  displayName: string;
};

export function TwinMeHero({
  displayName,
}: Props) {

  return (

<div className="space-y-4">

<div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-white/[0.04] p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)] backdrop-blur-xl">

<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_42%)]" />

<div className="relative flex items-center justify-between">

<div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-100">

<span className="h-2 w-2 rounded-full bg-fuchsia-300 animate-pulse"/>

Identity Core

</div>

</div>


<h1 className="mt-5 text-4xl font-black tracking-tight text-white">

TwinMe

</h1>


<p className="mt-4 text-sm font-semibold text-cyan-100">

Good evening, {displayName}.

</p>


<p className="mt-3 text-sm leading-6 text-white/65">

TwinMe is reading your current state,
crew alignment,
environment pressure,
and learned rhythm.

</p>

</div>

</div>

  );

}