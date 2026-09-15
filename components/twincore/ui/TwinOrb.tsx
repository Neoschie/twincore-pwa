"use client";

import Image from "next/image";

export type TwinOrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "guardian"
  | "warning"
  | "recovering"
  | "celebrating"
  | "offline";

export type TwinOrbSize =
  | "sm"
  | "md"
  | "lg"
  | "xl";

type Props = {
  state?: TwinOrbState;
  size?: TwinOrbSize;

  pulse?: boolean;
  rotate?: boolean;
  glow?: boolean;

  showRings?: boolean;
  showParticles?: boolean;

  className?: string;
};

function sizeClasses(size: TwinOrbSize) {
  switch (size) {
    case "sm":
      return "h-20 w-20";

    case "md":
      return "h-28 w-28";

    case "xl":
      return "h-52 w-52 sm:h-60 sm:w-60";

    default:
      return "h-36 w-36 sm:h-40 sm:w-40";
  }
}

function stateStyles(state: TwinOrbState) {
  switch (state) {
    case "listening":
      return {
        aura: "bg-cyan-300/20",
        secondary: "bg-blue-400/12",
        ring: "border-cyan-200/30",
        shadow: "drop-shadow-[0_0_55px_rgba(34,211,238,0.80)]",
        animation: "twinOrbListening",
      };

    case "thinking":
      return {
        aura: "bg-fuchsia-400/20",
        secondary: "bg-cyan-400/12",
        ring: "border-fuchsia-200/30",
        shadow: "drop-shadow-[0_0_60px_rgba(217,70,239,0.78)]",
        animation: "twinOrbThinking",
      };

    case "speaking":
      return {
        aura: "bg-cyan-200/22",
        secondary: "bg-fuchsia-400/10",
        ring: "border-cyan-100/28",
        shadow: "drop-shadow-[0_0_65px_rgba(103,232,249,0.82)]",
        animation: "twinOrbSpeaking",
      };

    case "guardian":
      return {
        aura: "bg-amber-300/22",
        secondary: "bg-red-400/12",
        ring: "border-amber-200/35",
        shadow: "drop-shadow-[0_0_65px_rgba(251,191,36,0.80)]",
        animation: "twinOrbGuardian",
      };

    case "warning":
      return {
        aura: "bg-red-400/22",
        secondary: "bg-amber-400/12",
        ring: "border-red-200/35",
        shadow: "drop-shadow-[0_0_70px_rgba(248,113,113,0.85)]",
        animation: "twinOrbWarning",
      };

    case "recovering":
      return {
        aura: "bg-fuchsia-400/16",
        secondary: "bg-cyan-400/11",
        ring: "border-fuchsia-200/24",
        shadow: "drop-shadow-[0_0_55px_rgba(217,70,239,0.62)]",
        animation: "twinOrbRecovering",
      };

    case "celebrating":
      return {
        aura: "bg-emerald-300/20",
        secondary: "bg-fuchsia-400/12",
        ring: "border-emerald-200/30",
        shadow: "drop-shadow-[0_0_65px_rgba(52,211,153,0.75)]",
        animation: "twinOrbCelebrating",
      };

    case "offline":
      return {
        aura: "bg-white/[0.04]",
        secondary: "bg-white/[0.02]",
        ring: "border-white/10",
        shadow: "drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]",
        animation: "twinOrbOffline",
      };

    default:
      return {
        aura: "bg-cyan-400/14",
        secondary: "bg-fuchsia-400/08",
        ring: "border-cyan-200/20",
        shadow: "drop-shadow-[0_0_50px_rgba(34,211,238,0.60)]",
        animation: "twinOrbIdle",
      };
  }
}

export function TwinOrb({
  state = "idle",
  size = "lg",

  pulse = true,
  rotate = true,
  glow = true,

  showRings = true,
  showParticles = true,

  className = "",
}: Props) {
  const styles = stateStyles(state);

  const listening = state === "listening";
  const thinking = state === "thinking";
  const speaking = state === "speaking";
  const guardian = state === "guardian";
  const warning = state === "warning";
  const celebrating = state === "celebrating";

  return (
    <div
      data-twin-orb-state={state}
      className={[
        "relative isolate flex items-center justify-center",
        sizeClasses(size),
        className,
      ].join(" ")}
    >
      {glow ? (
        <>
          <div
            aria-hidden="true"
            className={[
              "pointer-events-none absolute inset-[-28%] -z-20 rounded-full blur-[52px]",
              "transition-all duration-700",
              styles.aura,
            ].join(" ")}
          />

          <div
            aria-hidden="true"
            className={[
              "pointer-events-none absolute inset-[-45%] -z-30 rounded-full blur-[76px]",
              "transition-all duration-700",
              styles.secondary,
            ].join(" ")}
          />
        </>
      ) : null}

      {showRings ? (
        <>
          <div
            aria-hidden="true"
            className={[
              "twin-orb-ring-one absolute inset-[-12%] rounded-full border",
              styles.ring,
            ].join(" ")}
          />

          <div
            aria-hidden="true"
            className={[
              "twin-orb-ring-two absolute inset-[-26%] rounded-full border opacity-60",
              styles.ring,
            ].join(" ")}
          />
        </>
      ) : null}

      {listening ? (
        <>
          <div
            aria-hidden="true"
            className="twin-orb-ripple twin-orb-ripple-one absolute inset-[-18%] rounded-full border border-cyan-200/25"
          />
          <div
            aria-hidden="true"
            className="twin-orb-ripple twin-orb-ripple-two absolute inset-[-18%] rounded-full border border-cyan-100/18"
          />
        </>
      ) : null}

      {speaking ? (
        <>
          <div
            aria-hidden="true"
            className="twin-orb-speech twin-orb-speech-one absolute inset-[-12%] rounded-full border border-cyan-100/25"
          />
          <div
            aria-hidden="true"
            className="twin-orb-speech twin-orb-speech-two absolute inset-[-12%] rounded-full border border-fuchsia-100/14"
          />
        </>
      ) : null}

      {guardian || warning ? (
        <div
          aria-hidden="true"
          className={[
            "twin-orb-shield absolute inset-[-18%] rounded-full border",
            guardian
              ? "border-amber-200/30 shadow-[0_0_35px_rgba(251,191,36,0.22)]"
              : "border-red-200/35 shadow-[0_0_42px_rgba(248,113,113,0.28)]",
          ].join(" ")}
        />
      ) : null}

      {showParticles && (thinking || celebrating) ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-30%]"
        >
          {Array.from({ length: 10 }).map((_, index) => (
            <span
              key={index}
              className={[
                "twin-orb-particle absolute left-1/2 top-1/2 h-1 w-1 rounded-full",
                celebrating
                  ? "bg-emerald-200 shadow-[0_0_8px_rgba(110,231,183,0.95)]"
                  : "bg-fuchsia-200 shadow-[0_0_8px_rgba(240,171,252,0.95)]",
              ].join(" ")}
              style={{
                ["--particle-index" as string]: index,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className={[
          "twin-orb-body pointer-events-none absolute inset-0",
          pulse ? "twin-orb-pulse-enabled" : "",
          rotate ? "twin-orb-rotate-enabled" : "",
        ].join(" ")}
        style={{
          ["--twin-orb-animation" as string]: styles.animation,
        }}
      >
        <Image
          src="/brand/twinme-orb.png"
          alt="TwinMe"
          fill
          priority={size === "xl"}
          sizes="(max-width: 640px) 240px, 320px"
          className={[
            "select-none object-contain transition-[filter,opacity] duration-700",
            styles.shadow,
            state === "offline"
              ? "opacity-40 grayscale"
              : "opacity-100",
          ].join(" ")}
        />
      </div>

      <style jsx>{`
        .twin-orb-body {
          animation:
            var(--twin-orb-animation) 7s ease-in-out infinite;
          transform-origin: center;
        }

        .twin-orb-ring-one {
          animation: twinOrbRingOne 14s linear infinite;
        }

        .twin-orb-ring-two {
          animation: twinOrbRingTwo 20s linear infinite reverse;
        }

        .twin-orb-ripple {
          opacity: 0;
          animation: twinOrbRipple 2.6s ease-out infinite;
        }

        .twin-orb-ripple-two {
          animation-delay: 1.3s;
        }

        .twin-orb-speech {
          opacity: 0;
          animation: twinOrbSpeechWave 1.5s ease-out infinite;
        }

        .twin-orb-speech-two {
          animation-delay: 0.75s;
        }

        .twin-orb-shield {
          animation: twinOrbShield 1.8s ease-in-out infinite;
        }

        .twin-orb-particle {
          --angle: calc(var(--particle-index) * 36deg);
          animation: twinOrbParticle 2.8s ease-in-out infinite;
          animation-delay: calc(var(--particle-index) * -0.18s);
        }

        @keyframes twinOrbIdle {
          0%,
          100% {
            transform: scale(0.985);
            filter: saturate(1);
          }

          50% {
            transform: scale(1.02);
            filter: saturate(1.08) brightness(1.03);
          }
        }

        @keyframes twinOrbListening {
          0%,
          100% {
            transform: scale(0.985);
          }

          50% {
            transform: scale(1.045);
          }
        }

        @keyframes twinOrbThinking {
          0%,
          100% {
            transform: scale(0.99) rotate(-0.5deg);
            filter: saturate(1.05);
          }

          50% {
            transform: scale(1.055) rotate(0.5deg);
            filter: saturate(1.22) brightness(1.08);
          }
        }

        @keyframes twinOrbSpeaking {
          0%,
          100% {
            transform: scale(0.995);
          }

          35% {
            transform: scale(1.035);
          }

          65% {
            transform: scale(1.012);
          }
        }

        @keyframes twinOrbGuardian {
          0%,
          100% {
            transform: scale(0.99);
          }

          50% {
            transform: scale(1.055);
            filter: brightness(1.08);
          }
        }

        @keyframes twinOrbWarning {
          0%,
          100% {
            transform: scale(0.985);
          }

          25% {
            transform: scale(1.035);
          }

          50% {
            transform: scale(1.005);
          }

          75% {
            transform: scale(1.045);
          }
        }

        @keyframes twinOrbRecovering {
          0%,
          100% {
            transform: scale(0.985);
            filter: saturate(0.95);
          }

          50% {
            transform: scale(1.025);
            filter: saturate(1.08);
          }
        }

        @keyframes twinOrbCelebrating {
          0%,
          100% {
            transform: scale(0.99) rotate(-1deg);
          }

          50% {
            transform: scale(1.065) rotate(1deg);
            filter: saturate(1.2) brightness(1.1);
          }
        }

        @keyframes twinOrbOffline {
          0%,
          100% {
            transform: scale(0.99);
            opacity: 0.72;
          }

          50% {
            transform: scale(1.005);
            opacity: 0.5;
          }
        }

        @keyframes twinOrbRingOne {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes twinOrbRingTwo {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes twinOrbRipple {
          0% {
            opacity: 0.45;
            transform: scale(0.72);
          }

          100% {
            opacity: 0;
            transform: scale(1.65);
          }
        }

        @keyframes twinOrbSpeechWave {
          0% {
            opacity: 0.36;
            transform: scale(0.88);
          }

          100% {
            opacity: 0;
            transform: scale(1.48);
          }
        }

        @keyframes twinOrbShield {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.98);
          }

          50% {
            opacity: 0.95;
            transform: scale(1.075);
          }
        }

        @keyframes twinOrbParticle {
          0% {
            opacity: 0;
            transform:
              rotate(var(--angle))
              translateX(96px)
              scale(0.5);
          }

          45% {
            opacity: 0.95;
          }

          100% {
            opacity: 0;
            transform:
              rotate(var(--angle))
              translateX(18px)
              scale(1.25);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .twin-orb-body,
          .twin-orb-ring-one,
          .twin-orb-ring-two,
          .twin-orb-ripple,
          .twin-orb-speech,
          .twin-orb-shield,
          .twin-orb-particle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
