type Props = {
  name: string;
  status: string | null;
};

export function DashboardHero({ name, status }: Props) {
  return (
    <section className="relative px-1 pb-2 pt-1 sm:px-0 sm:pb-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-100/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
            TwinCore
          </div>

          <h1 className="mt-2 text-[1.65rem] font-black tracking-[-0.045em] text-white sm:text-3xl">
            Good to see you, {name}.
          </h1>

          <p className="mt-1 text-xs font-medium text-white/38 sm:text-[13px]">
            Your world, intelligently connected.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 text-[10px] font-bold text-white/48 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_10px_rgba(103,232,249,0.65)]" />
          {status || "Twin standing by"}
        </div>
      </div>
    </section>
  );
}
