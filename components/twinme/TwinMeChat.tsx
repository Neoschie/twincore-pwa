type Props = {
  displayName?: string;
};

export function TwinMeChat({ displayName }: Props) {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-white/[0.035] p-5 backdrop-blur-xl">
      <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
        Talk to TwinMe
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/70">
        TwinMe chat shell ready for {displayName || "you"}.
      </div>
    </div>
  );
}