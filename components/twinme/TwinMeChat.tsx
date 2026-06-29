import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { MessageBubble } from "./MessageBubble";
import { chatScrollArea } from "./styles";

type ChatMessage = {
  id: string;
  role: "user" | "twin";
  text: string;
};

type Props = {
  displayName?: string;
  messages: ChatMessage[];
  isThinking: boolean;
  onStateCheck: () => void;
  showActionButtons: boolean;
  voiceSupported: boolean;
  browserName: string;
};

export function TwinMeChat({
  displayName,
  messages,
  isThinking,
  onStateCheck,
  showActionButtons,
  voiceSupported,
  browserName,
}: Props) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-white">Talk to TwinMe</h3>

        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
          Live
        </div>
      </div>

      <div className={chatScrollArea}>
        {messages.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-center text-sm leading-6 text-white/50">
            TwinMe is ready for {displayName || "you"}.
          </div>
        ) : (
          <>
            {messages.map((m, i) => {
              const isLatest = i === messages.length - 1;

              return (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "twin"
                      ? "animate-[fadeIn_0.45s_ease-out]"
                      : "animate-[fadeIn_0.25s_ease-out]"
                  } ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <MessageBubble role={m.role}>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>

                    {m.role === "twin" && isLatest && showActionButtons ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Link href="/spots" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center text-xs text-white/80 transition hover:bg-white/15 active:scale-[0.98]">
                          Open Spots
                        </Link>

                        <Link href="/crew" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center text-xs text-white/80 transition hover:bg-white/15 active:scale-[0.98]">
                          Check Crew
                        </Link>

                        <Link href="/exit" className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-100 transition hover:bg-red-500/15 active:scale-[0.98]">
                          Start Exit
                        </Link>

                        <button
                          type="button"
                          onClick={onStateCheck}
                          className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-100"
                        >
                          State Check
                        </button>
                      </div>
                    ) : null}
                  </MessageBubble>
                </div>
              );
            })}

            {isThinking ? (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {!voiceSupported ? (
        <div className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-3 py-2 text-center">
          <p className="text-xs text-yellow-100">
            Voice is not supported in {browserName}. Open TwinMe in Chrome to use voice.
          </p>
        </div>
      ) : null}
    </GlassPanel>
  );
}