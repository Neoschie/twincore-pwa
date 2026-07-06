export function DashboardHero() {
  return null;
}

type Props = {
  name: string;
  status: string | null;
};

export function DashboardHero({ name, status }: Props) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_45px_rgba(34,211,238,0.12)] backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
        TwinCore Dashboard
      </p>

      <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
        Welcome back, {name}.
      </h1>

      <p className="mt-3 text-sm leading-6 text-white/60">
        Your Twin is connected, learning, and watching your ecosystem.
      </p>

      <div className="mt-5 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-100">
        {status || "Twin Status: Standing by"}
      </div>
    </section>
  );
}