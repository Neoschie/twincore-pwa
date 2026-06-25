type ChatMessage = {
  id: string;
  role: "user" | "twin";
  text: string;
};

type Props = {
  displayName?: string;
  messages: ChatMessage[];
  isThinking: boolean;
};

export function TwinMeChat({
  displayName,
  messages,
  isThinking,
}: Props) {
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

      <div className="min-h-[280px] max-h-[380px] overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-center text-sm leading-6 text-white/50">
            TwinMe is ready for {displayName || "you"}.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl p-3.5 text-sm leading-6 shadow-sm ${
                  m.role === "twin"
                    ? "border border-blue-400/20 bg-blue-500/10 text-white"
                    : "bg-white/10 text-white"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}

        {isThinking ? (
          <div className="flex justify-start">
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}