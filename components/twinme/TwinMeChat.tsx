type Props = {
  displayName?: string;
};

export function TwinMeChat({ displayName }: Props) {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-white/[0.035] p-5 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-white">
          Talk to TwinMe
        </h3>

        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
          Live
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/70">
        Chat stream ready for {displayName || "you"}.
      </div>
    </div>
  );
}