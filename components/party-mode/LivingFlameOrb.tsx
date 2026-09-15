"use client";

import { useMemo } from "react";

type LivingFlameOrbProps = {
  className?: string;
  compact?: boolean;
  active?: boolean;
};

export default function LivingFlameOrb({
  className = "",
  compact = false,
  active = true,
}: LivingFlameOrbProps) {
  const sparks = useMemo(
    () => Array.from({ length: compact ? 18 : 34 }, (_, index) => index),
    [compact]
  );

  return (
    <div
      className={[
        "living-flame-orb",
        compact ? "living-flame-orb--compact" : "",
        active ? "is-active" : "is-paused",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      <svg
        className="living-flame-orb__svg"
        viewBox="0 0 240 240"
        role="presentation"
      >
        <defs>
          <filter id={compact ? "flameGlowCompact" : "flameGlow"}>
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient
            id={compact ? "flameGradientCompact" : "flameGradient"}
            x1="0%"
            x2="100%"
          >
            <stop offset="0%" stopColor="#ff2bd6" />
            <stop offset="45%" stopColor="#b82cff" />
            <stop offset="100%" stopColor="#008cff" />
          </linearGradient>
        </defs>

        <g
          className="living-flame-orb__plasma"
          filter={`url(#${compact ? "flameGlowCompact" : "flameGlow"})`}
        >
          <path
            d="M120 18
               C143 27 153 42 160 58
               C174 44 190 41 204 47
               C196 63 198 78 208 92
               C219 108 219 128 207 143
               C195 158 193 175 199 192
               C181 188 165 195 153 208
               C141 220 122 224 106 217
               C90 210 75 210 58 219
               C59 201 52 187 39 175
               C25 163 20 144 27 126
               C34 109 34 94 24 78
               C41 77 54 68 63 54
               C72 39 91 26 120 18Z"
            fill="none"
            stroke={`url(#${compact ? "flameGradientCompact" : "flameGradient"})`}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M120 31
               C140 38 151 51 158 67
               C171 55 184 53 195 58
               C188 71 190 84 198 96
               C207 110 207 126 197 139
               C186 153 184 168 190 182
               C174 179 160 185 150 196
               C139 207 123 211 109 205
               C94 199 80 199 65 207
               C66 191 60 178 49 168
               C37 158 33 142 39 127
               C45 112 45 99 36 85
               C51 84 62 76 70 64
               C78 51 94 39 120 31Z"
            fill="none"
            stroke={`url(#${compact ? "flameGradientCompact" : "flameGradient"})`}
            strokeWidth="2.2"
            opacity="0.75"
          />
        </g>

        <circle
          className="living-flame-orb__pulse-ring"
          cx="120"
          cy="120"
          r="78"
        />
      </svg>

      <div className="living-flame-orb__embers">
        {sparks.map((index) => (
          <i
            key={index}
            style={
              {
                "--ember-index": index,
                "--ember-count": sparks.length,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
