import Image from "next/image";

import type { TwinPresentationControllerResult } from "@/lib/twinme/presentation-controller";

type TwinMeOrbState = {
  label: string;
  smoke: string;
  ring: string;
  text: string;
  insight: string;
  spin: string;
  pulse: string;
  spark: boolean;
  aura?: string;
};

type Greeting = {
  greeting: string;
  headline: string;
  body: string;
};

type Props = {
  displayName: string;
  orbState: TwinMeOrbState;
  greeting: Greeting;
  presentation?: TwinPresentationControllerResult;
};

export function TwinMeHero({
  displayName,
  orbState,
  greeting,
  presentation,
}: Props) {
  const state = presentation?.state ?? "ambient";

  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isGuardian = state === "guardian";
  const isMemory = state === "memory";

  const stateLabel =
    state === "ambient"
      ? "Present"
      : state === "listening"
      ? "Listening"
      : state === "thinking"
      ? "Thinking"
      : state === "speaking"
      ? "Speaking"
      : state === "guardian"
      ? "Guardian"
      : state === "memory"
      ? "Remembering"
      : "Connected";

  const presenceText =
    isGuardian
      ? "Protective awareness active"
      : isListening
      ? "Listening to you"
      : isThinking
      ? "Connecting the context"
      : isSpeaking
      ? "Speaking with you"
      : isMemory
      ? "Bringing memory forward"
      : "Aware of what matters now";

  return (
    <section
      data-twin-state={state}
      className="relative isolate px-2 pb-5 pt-2 text-center sm:px-4 sm:pt-5"
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-1/2 top-[43%] -z-20",
          "h-[520px] w-[min(112vw,820px)] -translate-x-1/2 -translate-y-1/2",
          "rounded-full blur-[150px] transition-all duration-1000",
          isGuardian
            ? "bg-amber-500/[0.10]"
            : isThinking
            ? "bg-fuchsia-500/[0.09]"
            : isListening
            ? "bg-cyan-400/[0.09]"
            : isSpeaking
            ? "bg-blue-400/[0.08]"
            : isMemory
            ? "bg-violet-500/[0.08]"
            : "bg-cyan-400/[0.065]",
        ].join(" ")}
      />

      <div className="relative z-20 mx-auto flex max-w-xl items-center justify-center">
        <div
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-2",
            "bg-black/20 text-[9px] font-black uppercase tracking-[0.24em]",
            "backdrop-blur-xl transition-all duration-500",
            isGuardian
              ? "border-amber-300/25 text-amber-100"
              : "border-white/[0.08] text-white/42",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full transition-all duration-500",
              isGuardian
                ? "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.95)]"
                : isThinking
                ? "animate-pulse bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.85)]"
                : isListening || isSpeaking
                ? "animate-pulse bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]"
                : isMemory
                ? "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.75)]"
                : "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.75)]",
            ].join(" ")}
          />
          TwinMe • {stateLabel}
        </div>
      </div>

      <div className="relative mx-auto mt-3 h-[340px] w-full max-w-[680px] sm:h-[400px]">
        <div
          aria-hidden="true"
          className={[
            "absolute left-1/2 top-1/2 h-[390px] w-[390px]",
            "-translate-x-1/2 -translate-y-1/2 rounded-full blur-[115px]",
            "transition-all duration-700 sm:h-[470px] sm:w-[470px]",
            isGuardian
              ? "bg-amber-400/[0.18]"
              : isThinking
              ? "bg-fuchsia-400/[0.16]"
              : isListening
              ? "bg-cyan-300/[0.15]"
              : isSpeaking
              ? "bg-blue-300/[0.15]"
              : isMemory
              ? "bg-violet-400/[0.13]"
              : `${orbState.smoke} opacity-70`,
          ].join(" ")}
        />

        <div
          aria-hidden="true"
          className={[
            "absolute left-1/2 top-1/2 h-[240px] w-[430px]",
            "-translate-x-1/2 -translate-y-1/2 rounded-full blur-[85px]",
            isGuardian
              ? "bg-red-400/[0.07]"
              : isThinking
              ? "bg-cyan-300/[0.085]"
              : isMemory
              ? "bg-fuchsia-300/[0.075]"
              : "bg-cyan-300/[0.08]",
          ].join(" ")}
        />

        {isListening ? (
          <>
            <div
              aria-hidden="true"
              className="twin-ripple twin-ripple-one absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/25"
            />
            <div
              aria-hidden="true"
              className="twin-ripple twin-ripple-two absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200/20"
            />
          </>
        ) : null}

        {isSpeaking ? (
          <>
            <div
              aria-hidden="true"
              className="twin-speech-wave twin-speech-wave-one absolute left-1/2 top-1/2 h-[245px] w-[245px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/20"
            />
            <div
              aria-hidden="true"
              className="twin-speech-wave twin-speech-wave-two absolute left-1/2 top-1/2 h-[245px] w-[245px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-200/15"
            />
          </>
        ) : null}

        {isGuardian ? (
          <div
            aria-hidden="true"
            className="twin-guardian-shield absolute left-1/2 top-1/2 h-[285px] w-[285px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/30 shadow-[0_0_60px_rgba(251,191,36,0.18),inset_0_0_45px_rgba(239,68,68,0.08)]"
          />
        ) : null}

        {isThinking ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <span className="twin-thought twin-thought-1" />
            <span className="twin-thought twin-thought-2" />
            <span className="twin-thought twin-thought-3" />
            <span className="twin-thought twin-thought-4" />
            <span className="twin-thought twin-thought-5" />
            <span className="twin-thought twin-thought-6" />
            <span className="twin-thought twin-thought-7" />
            <span className="twin-thought twin-thought-8" />
          </div>
        ) : null}

        <div className="twin-orb-motion pointer-events-none absolute inset-0">
          <Image
            src="/brand/twinme-orb.png"
            alt="TwinMe"
            fill
            priority
            sizes="(max-width: 640px) 680px, 760px"
            className={[
              "select-none object-contain",
              "scale-[1.68] sm:scale-[1.78]",
              "transition-[filter] duration-700",
              isGuardian
                ? "drop-shadow-[0_0_135px_rgba(251,146,60,0.72)]"
                : isThinking
                ? "drop-shadow-[0_0_140px_rgba(217,70,239,0.72)]"
                : isListening
                ? "drop-shadow-[0_0_140px_rgba(34,211,238,0.74)]"
                : isSpeaking
                ? "drop-shadow-[0_0_145px_rgba(103,232,249,0.74)]"
                : isMemory
                ? "drop-shadow-[0_0_130px_rgba(167,139,250,0.64)]"
                : "drop-shadow-[0_0_120px_rgba(34,211,238,0.60)]",
            ].join(" ")}
          />
        </div>

        <div
          aria-hidden="true"
          className={[
            "absolute bottom-5 left-1/2 h-4 w-44 -translate-x-1/2",
            "rounded-[100%] blur-[18px] transition-all duration-700 sm:w-56",
            isGuardian
              ? "bg-amber-200/25"
              : isThinking
              ? "bg-fuchsia-200/20"
              : "bg-cyan-200/20",
          ].join(" ")}
        />
      </div>

      <div className="relative z-10 mx-auto -mt-2 max-w-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/55">
          {greeting.greeting}
        </p>

        <h1 className="mx-auto mt-4 max-w-xl text-balance text-[clamp(2.35rem,6vw,4.15rem)] font-black leading-[0.96] tracking-[-0.05em] text-white">
          {greeting.headline}
        </h1>

        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/52 sm:text-[15px]">
          {greeting.body}
        </p>

        <div className="mx-auto mt-7 flex max-w-lg items-center justify-center gap-3">
          <div
            className={[
              "h-px flex-1 bg-gradient-to-r from-transparent",
              isGuardian ? "to-amber-200/20" : "to-cyan-200/18",
            ].join(" ")}
          />

          <div className="shrink-0">
            <div className={`text-sm font-black tracking-[0.08em] ${orbState.text}`}>
              {orbState.label}
            </div>

            <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/28">
              {presenceText}
            </div>
          </div>

          <div
            className={[
              "h-px flex-1 bg-gradient-to-l from-transparent",
              isGuardian ? "to-amber-200/20" : "to-cyan-200/18",
            ].join(" ")}
          />
        </div>

        <p className="mx-auto mt-4 max-w-md text-[11px] leading-5 text-white/34">
          {orbState.insight}
        </p>

        <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
          Present with {displayName || "you"}
        </p>
      </div>

      <style jsx>{`
        .twin-orb-motion {
          animation: twinAmbientBreath 9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        [data-twin-state="listening"] .twin-orb-motion {
          animation: twinListening 2.4s ease-in-out infinite;
        }

        [data-twin-state="thinking"] .twin-orb-motion {
          animation: twinThinking 1.8s ease-in-out infinite;
        }

        [data-twin-state="speaking"] .twin-orb-motion {
          animation: twinSpeaking 1.15s ease-in-out infinite;
        }

        [data-twin-state="guardian"] .twin-orb-motion {
          animation: twinGuardian 1.35s ease-in-out infinite;
        }

        [data-twin-state="memory"] .twin-orb-motion {
          animation: twinMemory 6.5s ease-in-out infinite;
        }

        .twin-ripple {
          opacity: 0;
          animation: twinRipple 2.7s ease-out infinite;
        }

        .twin-ripple-two {
          animation-delay: 1.35s;
        }

        .twin-speech-wave {
          opacity: 0;
          animation: twinSpeechWave 1.65s ease-out infinite;
        }

        .twin-speech-wave-two {
          animation-delay: 0.82s;
        }

        .twin-guardian-shield {
          animation: twinShield 1.8s ease-in-out infinite;
        }

        .twin-thought {
          position: absolute;
          left: 50%;
          top: 50%;
          height: 4px;
          width: 4px;
          border-radius: 999px;
          background: rgba(216, 180, 254, 0.95);
          box-shadow:
            0 0 9px rgba(217, 70, 239, 0.9),
            0 0 15px rgba(34, 211, 238, 0.45);
          transform-origin: center;
        }

        .twin-thought-1 { animation: thoughtOne 2.3s ease-in-out infinite; }
        .twin-thought-2 { animation: thoughtTwo 2.6s ease-in-out infinite; }
        .twin-thought-3 { animation: thoughtThree 2.1s ease-in-out infinite; }
        .twin-thought-4 { animation: thoughtFour 2.8s ease-in-out infinite; }
        .twin-thought-5 { animation: thoughtOne 2.5s -1.2s ease-in-out infinite; }
        .twin-thought-6 { animation: thoughtTwo 2.2s -0.8s ease-in-out infinite; }
        .twin-thought-7 { animation: thoughtThree 2.7s -1.4s ease-in-out infinite; }
        .twin-thought-8 { animation: thoughtFour 2.4s -1s ease-in-out infinite; }

        @keyframes twinAmbientBreath {
          0%, 100% {
            transform: scale(0.992);
            filter: saturate(1) brightness(0.99);
          }
          50% {
            transform: scale(1.018);
            filter: saturate(1.08) brightness(1.035);
          }
        }

        @keyframes twinListening {
          0%, 100% {
            transform: scale(0.99);
            filter: saturate(1.04) brightness(1);
          }
          50% {
            transform: scale(1.045);
            filter: saturate(1.16) brightness(1.08);
          }
        }

        @keyframes twinThinking {
          0%, 100% {
            transform: scale(0.995) rotate(-0.4deg);
            filter: saturate(1.08);
          }
          50% {
            transform: scale(1.055) rotate(0.4deg);
            filter: saturate(1.24) brightness(1.08);
          }
        }

        @keyframes twinSpeaking {
          0%, 100% {
            transform: scale(0.995);
            filter: brightness(1);
          }
          45% {
            transform: scale(1.035);
            filter: brightness(1.12);
          }
          70% {
            transform: scale(1.012);
            filter: brightness(1.05);
          }
        }

        @keyframes twinGuardian {
          0%, 100% {
            transform: scale(1);
            filter: saturate(1.05);
          }
          50% {
            transform: scale(1.055);
            filter: saturate(1.25) brightness(1.08);
          }
        }

        @keyframes twinMemory {
          0%, 100% {
            transform: scale(0.995);
            filter: saturate(0.95);
          }
          50% {
            transform: scale(1.025);
            filter: saturate(1.12) brightness(1.04);
          }
        }

        @keyframes twinRipple {
          0% {
            opacity: 0.48;
            transform: translate(-50%, -50%) scale(0.72);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.85);
          }
        }

        @keyframes twinSpeechWave {
          0% {
            opacity: 0.42;
            transform: translate(-50%, -50%) scale(0.88);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.55);
          }
        }

        @keyframes twinShield {
          0%, 100% {
            opacity: 0.48;
            transform: translate(-50%, -50%) scale(0.98);
          }
          50% {
            opacity: 0.95;
            transform: translate(-50%, -50%) scale(1.075);
          }
        }

        @keyframes thoughtOne {
          0% { opacity: 0; transform: translate(-165px, -55px) scale(0.7); }
          55% { opacity: 1; }
          100% { opacity: 0; transform: translate(-18px, -10px) scale(1.2); }
        }

        @keyframes thoughtTwo {
          0% { opacity: 0; transform: translate(155px, -75px) scale(0.65); }
          50% { opacity: 0.9; }
          100% { opacity: 0; transform: translate(20px, -8px) scale(1.2); }
        }

        @keyframes thoughtThree {
          0% { opacity: 0; transform: translate(-135px, 100px) scale(0.7); }
          50% { opacity: 0.9; }
          100% { opacity: 0; transform: translate(-16px, 12px) scale(1.15); }
        }

        @keyframes thoughtFour {
          0% { opacity: 0; transform: translate(145px, 90px) scale(0.7); }
          50% { opacity: 0.95; }
          100% { opacity: 0; transform: translate(16px, 10px) scale(1.15); }
        }

        @media (prefers-reduced-motion: reduce) {
          .twin-orb-motion,
          .twin-ripple,
          .twin-speech-wave,
          .twin-guardian-shield,
          .twin-thought {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
