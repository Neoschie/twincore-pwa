"use client";

import { TwinMeChat } from "@/components/twinme/TwinMeChat";
import { TwinMeInput } from "@/components/twinme/TwinMeInput";

type Message = {
  id: string;
  role: "user" | "twin";
  text: string;
};

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;

  displayName: string;
  messages: Message[];
  isThinking: boolean;

  onStateCheck: () => void;
  showActionButtons: boolean;

  voiceSupported: boolean;
  browserName: string;

  input: string;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;

  isListening: boolean;
  voiceOutputEnabled: boolean;
  handsFreeEnabled: boolean;
  onVoiceAction: () => void;
};

export function TwinMeConversation({
  open,
  onOpen,
  onClose,

  displayName,
  messages,
  isThinking,

  onStateCheck,
  showActionButtons,

  voiceSupported,
  browserName,

  input,
  onInputChange,
  onSend,

  isListening,
  voiceOutputEnabled,
  handsFreeEnabled,
  onVoiceAction,
}: Props) {
  if (!open) {
    return (
      <div className="mx-auto w-full max-w-[620px]">
        <button
          type="button"
          onClick={onOpen}
          className="group relative w-full overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-white/[0.018] px-5 py-4 text-left backdrop-blur-xl transition-all duration-300 hover:border-cyan-300/20 hover:bg-white/[0.032]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent"
          />

          <div className="flex items-center gap-4">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-fuchsia-400/15 to-cyan-400/15 blur-md transition-transform duration-500 group-hover:scale-125" />

              <span className="relative text-xl font-light text-cyan-200">
                ∞
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white/90">
                Talk to TwinMe
              </div>

              <div className="mt-1 text-[11px] leading-5 text-white/35">
                Bring me into the conversation.
              </div>
            </div>

            <span className="text-lg text-white/25 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-200/70">
              →
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[620px] animate-[twinConversationEnter_420ms_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <div className="text-sm font-semibold text-white/90">
            Conversation
          </div>

          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/45">
            TwinMe • Connected
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/40 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white/75"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <TwinMeChat
          displayName={displayName}
          messages={messages}
          isThinking={isThinking}
          onStateCheck={onStateCheck}
          showActionButtons={showActionButtons}
          voiceSupported={voiceSupported}
          browserName={browserName}
        />

        <TwinMeInput
          value={input}
          onChange={onInputChange}
          onSend={onSend}
          isListening={isListening}
          voiceOutputEnabled={voiceOutputEnabled}
          handsFreeEnabled={handsFreeEnabled}
          onVoiceAction={onVoiceAction}
        />
      </div>

      <style jsx>{`
        @keyframes twinConversationEnter {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </section>
  );
}
