"use client";

import { useMemo } from "react";

type PartyOrbEffectsProps = {
  active?: boolean;
  compact?: boolean;
  className?: string;
};

export default function PartyOrbEffects({
  active = true,
  compact = false,
  className = "",
}: PartyOrbEffectsProps) {
  const tongues = useMemo(
    () =>
      Array.from({ length: compact ? 20 : 34 }, (_, index) => ({
        index,
        height: 10 + ((index * 17) % (compact ? 18 : 34)),
        width: 3 + ((index * 7) % 5),
        delay: -((index * 83) % 1400),
      })),
    [compact]
  );

  const embers = useMemo(
    () =>
      Array.from({ length: compact ? 14 : 28 }, (_, index) => ({
        index,
        distance: 42 + ((index * 11) % 18),
        delay: -((index * 117) % 2400),
        duration: 1700 + ((index * 97) % 1500),
      })),
    [compact]
  );

  return (
    <div
      className={[
        "party-orb-effects",
        compact ? "party-orb-effects--compact" : "",
        active ? "is-active" : "is-paused",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="party-orb-effects__glow" />

      <div className="party-orb-effects__tongues">
        {tongues.map(({ index, height, width, delay }) => (
          <i
            key={index}
            style={
              {
                "--flame-index": index,
                "--flame-count": tongues.length,
                "--flame-height": `${height}px`,
                "--flame-width": `${width}px`,
                "--flame-delay": `${delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <svg
        className="party-orb-effects__arcs"
        viewBox="0 0 240 240"
        role="presentation"
      >
        <defs>
          <filter id={compact ? "arcGlowCompact" : "arcGlow"}>
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient
            id={compact ? "arcGradientCompact" : "arcGradient"}
            x1="0%"
            x2="100%"
          >
            <stop offset="0%" stopColor="#ff3cde" />
            <stop offset="48%" stopColor="#b53bff" />
            <stop offset="100%" stopColor="#00a8ff" />
          </linearGradient>
        </defs>

        <g
          className="party-orb-effects__arc-group"
          filter={`url(#${compact ? "arcGlowCompact" : "arcGlow"})`}
        >
          <path
            className="party-orb-effects__arc arc-a"
            d="M42 76 L58 63 L72 68 L87 51 L103 57 L120 40 L138 52 L155 44 L174 58 L193 51"
          />
          <path
            className="party-orb-effects__arc arc-b"
            d="M54 184 L68 170 L83 177 L97 160 L114 169 L132 151 L148 164 L165 153 L184 166"
          />
          <path
            className="party-orb-effects__arc arc-c"
            d="M37 124 L55 115 L69 123 L86 109 L101 116"
          />
        </g>
      </svg>

      <div className="party-orb-effects__embers">
        {embers.map(({ index, distance, delay, duration }) => (
          <i
            key={index}
            style={
              {
                "--ember-index": index,
                "--ember-count": embers.length,
                "--ember-distance": `${distance}%`,
                "--ember-delay": `${delay}ms`,
                "--ember-duration": `${duration}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
