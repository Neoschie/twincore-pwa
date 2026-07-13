type Props = {
  name: string;
  status: string | null;
};

export function DashboardHero({ name, status }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_55px_rgba(34,211,238,0.14)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
          TwinCore Command
        </div>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.03em] text-white">
          Welcome back, {name}.
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
          Your Twin is connected and adapting alongside you.
        </p>

        <div className="mt-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-100">
          {status || "Twin Status: Standing by"}
        </div>
      </div>
    </section>
  );
}