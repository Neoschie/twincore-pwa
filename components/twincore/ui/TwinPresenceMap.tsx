"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  HomeIcon,
  Radio,
  Users,
} from "lucide-react";

import { TwinOrb } from "@/components/twincore/ui/TwinOrb";

export type TwinPresenceTone =
  | "active"
  | "home"
  | "away"
  | "distress";

export type TwinPresenceNode = {
  id: string;
  name: string;
  status: string;
  tone: TwinPresenceTone;

  x: number;
  y: number;

  meta?: string;
};

type Props = {
  nodes: TwinPresenceNode[];

  title?: string;
  subtitle?: string;

  centerLabel?: string;
  centerMeta?: string;

  footer?: ReactNode;
};

const FALLBACK_POSITIONS = [
  { x: 23, y: 24 },
  { x: 77, y: 26 },
  { x: 22, y: 73 },
  { x: 78, y: 72 },
  { x: 50, y: 16 },
  { x: 50, y: 84 },
];

// TWINCORE_PRESENCE_FIELD_NON_GEOGRAPHIC_R16_8
// TwinPresenceMap x/y values are presentation coordinates only.
//
// They MUST NOT be interpreted as:
// - latitude / longitude
// - geographic distance
// - geographic direction
// - precise physical location
//
// Geographic authority remains outside this presentation component.
function displayPosition(
  node: TwinPresenceNode,
  index: number,
) {
  const dx = node.x - 50;
  const dy = node.y - 50;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Existing Crew positions can cluster close to TwinMe.
  // Expand them so the Presence Field actually owns the canvas.
  if (distance < 26) {
    return FALLBACK_POSITIONS[index % FALLBACK_POSITIONS.length];
  }

  const desiredRadius = Math.min(
    39,
    Math.max(30, distance * 1.3),
  );

  const scale = desiredRadius / Math.max(distance, 1);

  return {
    x: Math.min(84, Math.max(16, 50 + dx * scale)),
    y: Math.min(82, Math.max(18, 50 + dy * scale)),
  };
}

function toneVisuals(tone: TwinPresenceTone) {
  switch (tone) {
    case "distress":
      return {
        ring: "border-red-300/70",
        bg: "bg-red-500/20",
        text: "text-red-100",
        label: "text-red-300",
        aura: "bg-red-500/25",
        glow:
          "shadow-[0_0_18px_rgba(248,113,113,0.9),0_0_50px_rgba(239,68,68,0.42)]",
      };

    case "home":
      return {
        ring: "border-cyan-300/70",
        bg: "bg-cyan-500/16",
        text: "text-cyan-100",
        label: "text-cyan-300",
        aura: "bg-cyan-400/22",
        glow:
          "shadow-[0_0_18px_rgba(34,211,238,0.85),0_0_48px_rgba(14,165,233,0.36)]",
      };

    case "away":
      return {
        ring: "border-amber-300/70",
        bg: "bg-amber-500/16",
        text: "text-amber-100",
        label: "text-amber-300",
        aura: "bg-orange-400/22",
        glow:
          "shadow-[0_0_18px_rgba(251,146,60,0.85),0_0_48px_rgba(245,158,11,0.35)]",
      };

    default:
      return {
        ring: "border-fuchsia-300/70",
        bg: "bg-fuchsia-500/16",
        text: "text-fuchsia-100",
        label: "text-fuchsia-300",
        aura: "bg-fuchsia-400/22",
        glow:
          "shadow-[0_0_18px_rgba(217,70,239,0.85),0_0_48px_rgba(168,85,247,0.35)]",
      };
  }
}

function NodeIcon({
  tone,
}: {
  tone: TwinPresenceTone;
}) {
  if (tone === "distress") {
    return <AlertTriangle className="h-5 w-5" />;
  }

  if (tone === "home") {
    return <HomeIcon className="h-5 w-5" />;
  }

  if (tone === "away") {
    return <Radio className="h-5 w-5" />;
  }

  return <Users className="h-5 w-5" />;
}

export function TwinPresenceMap({
  nodes,
  title = "Crew Presence",
  subtitle = "Live spatial awareness across your trusted crew.",
  centerLabel = "TwinMe",
  centerMeta = "Crew core",
  footer,
}: Props) {
  const hasDistress = nodes.some(
    (node) => node.tone === "distress",
  );

  const positionedNodes = nodes.map((node, index) => ({
    ...node,
    display: displayPosition(node, index),
  }));

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[2rem] border",
        hasDistress
          ? "border-red-300/18"
          : "border-cyan-300/16",
        "bg-[#030711]/95",
        "shadow-[0_30px_90px_rgba(0,0,0,0.45)]",
      ].join(" ")}
    >
      <div className="relative z-20 flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-100/42">
            Spatial Intelligence
          </div>

          <h3 className="mt-2 text-lg font-black tracking-[-0.02em] text-white">
            {title}
          </h3>

          <p className="mt-1 text-[11px] text-white/42">
            {subtitle}
          </p>
        </div>

        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
          {nodes.length} visible
        </div>
      </div>

      <div className="relative h-[470px] overflow-hidden sm:h-[560px]">
        {/* Deep-space atmosphere */}
        <div
          aria-hidden="true"
          className={[
            "absolute inset-0",
            hasDistress
              ? "bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.11),transparent_24%),radial-gradient(circle_at_75%_28%,rgba(217,70,239,0.10),transparent_25%),radial-gradient(circle_at_22%_70%,rgba(14,165,233,0.09),transparent_25%)]"
              : "bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.11),transparent_24%),radial-gradient(circle_at_75%_28%,rgba(217,70,239,0.10),transparent_25%),radial-gradient(circle_at_22%_70%,rgba(14,165,233,0.09),transparent_25%)]",
          ].join(" ")}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.65)_0.6px,transparent_0.8px)] [background-size:31px_31px]"
        />

        {/* Ambient stars */}
        {Array.from({ length: 32 }).map((_, index) => (
          <span
            key={`star-${index}`}
            aria-hidden="true"
            className={[
              "presence-star absolute rounded-full",
              index % 4 === 0
                ? "h-1 w-1 bg-fuchsia-200/55"
                : index % 3 === 0
                  ? "h-1 w-1 bg-cyan-200/55"
                  : "h-[2px] w-[2px] bg-white/38",
            ].join(" ")}
            style={{
              left: `${5 + ((index * 37) % 90)}%`,
              top: `${6 + ((index * 53) % 86)}%`,
              animationDelay: `${index * -0.32}s`,
            }}
          />
        ))}

        {/* Very subtle depth rings - not radar */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/[0.045]"
        />

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/[0.05]"
        />

        {/* CINEMATIC FLAME NETWORK */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <filter
              id="presenceFlameNoise"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.075"
                numOctaves="3"
                seed="11"
                result="noise"
              />

              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="3.8"
                xChannelSelector="R"
                yChannelSelector="B"
              />
            </filter>

            <filter
              id="presenceFlameGlow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur
                stdDeviation="1.7"
                result="outer"
              />
              <feGaussianBlur
                stdDeviation="0.7"
                result="inner"
              />
              <feMerge>
                <feMergeNode in="outer" />
                <feMergeNode in="inner" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="fireRed" x1="0" x2="1">
              <stop offset="0%" stopColor="#ff2d55" />
              <stop offset="40%" stopColor="#ff453a" />
              <stop offset="72%" stopColor="#ff9f0a" />
              <stop offset="100%" stopColor="#fff0c2" />
            </linearGradient>

            <linearGradient id="fireBlue" x1="0" x2="1">
              <stop offset="0%" stopColor="#006cff" />
              <stop offset="38%" stopColor="#00d4ff" />
              <stop offset="72%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#ecfeff" />
            </linearGradient>

            <linearGradient id="firePurple" x1="0" x2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="40%" stopColor="#d946ef" />
              <stop offset="75%" stopColor="#f0abfc" />
              <stop offset="100%" stopColor="#cffafe" />
            </linearGradient>

            <linearGradient id="fireAmber" x1="0" x2="1">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="42%" stopColor="#f97316" />
              <stop offset="74%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
          </defs>

          {positionedNodes.map((node, index) => {
            const { x, y } = node.display;

            const gradient =
              node.tone === "distress"
                ? "url(#fireRed)"
                : node.tone === "home"
                  ? "url(#fireBlue)"
                  : node.tone === "away"
                    ? "url(#fireAmber)"
                    : "url(#firePurple)";

            const faint =
              node.tone === "distress"
                ? "#ef4444"
                : node.tone === "home"
                  ? "#22d3ee"
                  : node.tone === "away"
                    ? "#f97316"
                    : "#d946ef";

            const side = x < 50 ? -1 : 1;
            const vertical = y < 50 ? -1 : 1;

            const c1x = 50 + 11 * side;
            const c1y = 50 + 5 * vertical;

            const c2x = x - 10 * side;
            const c2y = y - 5 * vertical;

            const path =
              `M 50 50 C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x} ${y}`;

            return (
              <g key={`fire-${node.id}`}>
                {/* large atmospheric plume */}
                <path
                  d={path}
                  fill="none"
                  stroke={faint}
                  strokeWidth={
                    node.tone === "distress"
                      ? 5.8
                      : 4.8
                  }
                  strokeLinecap="round"
                  opacity="0.20"
                  filter="url(#presenceFlameGlow)"
                  className="presence-flame-aura"
                />

                {/* thick flame body */}
                <path
                  d={path}
                  fill="none"
                  stroke={gradient}
                  strokeWidth={
                    node.tone === "distress"
                      ? 3.25
                      : 2.75
                  }
                  strokeLinecap="round"
                  strokeDasharray="12 3 5 2"
                  filter="url(#presenceFlameNoise)"
                  className={[
                    "presence-flame-body",
                    node.tone === "distress"
                      ? "presence-flame-danger"
                      : "",
                  ].join(" ")}
                  style={{
                    animationDelay: `${index * -0.43}s`,
                  }}
                />

                {/* secondary turbulent tongue */}
                <path
                  d={path}
                  fill="none"
                  stroke={gradient}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeDasharray="3 7 14 4"
                  filter="url(#presenceFlameNoise)"
                  opacity="0.86"
                  className="presence-flame-secondary"
                  style={{
                    animationDelay: `${index * -0.71}s`,
                  }}
                />

                {/* white-hot core */}
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(255,255,255,0.82)"
                  strokeWidth="0.48"
                  strokeLinecap="round"
                  strokeDasharray="1 6"
                  className="presence-flame-core"
                  style={{
                    animationDelay: `${index * -0.52}s`,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* TwinMe core */}
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
            <div
              aria-hidden="true"
              className={[
                "absolute inset-[-32px] rounded-full blur-[44px]",
                hasDistress
                  ? "bg-red-500/16"
                  : "bg-cyan-400/15",
              ].join(" ")}
            />

            <TwinOrb
              state={
                hasDistress
                  ? "warning"
                  : "guardian"
              }
              size="xl"
              pulse
              rotate
              glow
              showParticles
              showRings={false}
            />
          </div>

          <div className="mt-2 text-center">
            <div className="text-base font-black tracking-[-0.03em] text-white">
              {centerLabel}
            </div>

            <div
              className={[
                "mt-1 text-[8px] font-black uppercase tracking-[0.22em]",
                hasDistress
                  ? "text-red-200"
                  : "text-cyan-200/55",
              ].join(" ")}
            >
              {centerMeta}
            </div>
          </div>
        </div>

        {/* Crew nodes */}
        {positionedNodes.map((node, index) => {
          const visual = toneVisuals(node.tone);
          const { x, y } = node.display;

          return (
            <div
              key={node.id}
              className="presence-node absolute z-40 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${index * -1.7}s`,
                ["--presence-drift-x" as string]:
                  `${index % 2 === 0 ? 4 : -4}px`,
                ["--presence-drift-y" as string]:
                  `${index % 3 === 0 ? -5 : 4}px`,
              }}
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={[
                    "absolute top-0 h-20 w-20 rounded-full blur-2xl",
                    visual.aura,
                    node.tone === "distress"
                      ? "animate-pulse"
                      : "",
                  ].join(" ")}
                />

                {node.tone === "distress" ? (
                  <span className="absolute top-0 h-16 w-16 rounded-full border border-red-300/40 animate-ping" />
                ) : null}

                <div
                  className={[
                    "relative grid h-14 w-14 place-items-center rounded-full border-2 backdrop-blur-xl sm:h-16 sm:w-16",
                    visual.ring,
                    visual.bg,
                    visual.text,
                    visual.glow,
                  ].join(" ")}
                >
                  <NodeIcon tone={node.tone} />
                </div>

                <div className="mt-3 min-w-[94px] text-center">
                  <div className="truncate text-[12px] font-black text-white">
                    {node.name}
                  </div>

                  <div
                    className={[
                      "mt-1 text-[8px] font-black uppercase tracking-[0.14em]",
                      visual.label,
                    ].join(" ")}
                  >
                    {node.status}
                  </div>

                  {node.meta ? (
                    <div className="mt-1 max-w-[110px] truncate text-[8px] text-white/28">
                      {node.meta}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#030711] via-[#030711]/75 to-transparent" />
      </div>

      {footer ? (
        <div className="relative z-50 border-t border-white/[0.06] bg-black/20 px-5 py-4 backdrop-blur-xl sm:px-6">
          {footer}
        </div>
      ) : null}

      <style jsx>{`
        .presence-star {
          animation: presenceStar 5s ease-in-out infinite alternate;
        }

        .presence-node {
          animation: presenceNodeFloat 9s ease-in-out infinite alternate;
          will-change: transform;
        }

        .presence-flame-body {
          animation:
            presenceFlameFlow 2.7s linear infinite,
            presenceFlameBreath 1.7s ease-in-out infinite alternate;
        }

        .presence-flame-danger {
          animation-duration: 1.45s, 0.9s;
        }

        .presence-flame-secondary {
          animation: presenceFlameFlowSecondary 3.4s linear infinite reverse;
        }

        .presence-flame-core {
          animation: presenceFlameCore 1.8s linear infinite;
        }

        .presence-flame-aura {
          animation: presenceFlameAura 2.4s ease-in-out infinite alternate;
        }

        @keyframes presenceFlameFlow {
          from {
            stroke-dashoffset: 44;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes presenceFlameFlowSecondary {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: 52;
          }
        }

        @keyframes presenceFlameCore {
          from {
            stroke-dashoffset: 14;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes presenceFlameBreath {
          from {
            opacity: 0.68;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes presenceFlameAura {
          from {
            opacity: 0.16;
          }
          to {
            opacity: 0.42;
          }
        }

        @keyframes presenceNodeFloat {
          0% {
            transform:
              translate(-50%, -50%)
              translate(0, 0);
          }

          50% {
            transform:
              translate(-50%, -50%)
              translate(
                var(--presence-drift-x),
                var(--presence-drift-y)
              );
          }

          100% {
            transform:
              translate(-50%, -50%)
              translate(
                calc(var(--presence-drift-x) * -0.6),
                calc(var(--presence-drift-y) * -0.6)
              );
          }
        }

        @keyframes presenceStar {
          from {
            opacity: 0.12;
            transform: scale(0.8);
          }
          to {
            opacity: 0.75;
            transform: scale(1.35);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .presence-star,
          .presence-node,
          .presence-flame-body,
          .presence-flame-secondary,
          .presence-flame-core,
          .presence-flame-aura {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
