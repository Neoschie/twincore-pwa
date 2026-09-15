"use client";

type OrbLightningProps = {
  active: boolean;
};

export default function OrbLightning({
  active,
}: OrbLightningProps) {
  return (
    <svg
      className={`tc-orb__arcs ${
        active ? "is-active" : "is-paused"
      }`}
      viewBox="0 0 240 240"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tcArcGradient" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#ff38dd" />
          <stop offset="48%" stopColor="#a63dff" />
          <stop offset="100%" stopColor="#00a8ff" />
        </linearGradient>

        <filter id="tcArcGlow">
          <feGaussianBlur stdDeviation="2.2" result="blur" />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#tcArcGlow)">
        <path
          className="tc-orb__arc tc-orb__arc--a"
          d="M42 70 L58 60 L73 68 L89 50 L105 57 L121 41 L138 53 L155 44 L177 59 L198 49"
        />

        <path
          className="tc-orb__arc tc-orb__arc--b"
          d="M48 183 L66 169 L83 177 L99 159 L116 169 L134 151 L151 164 L169 153 L191 168"
        />

        <path
          className="tc-orb__arc tc-orb__arc--c"
          d="M34 126 L52 115 L69 124 L86 108 L105 117"
        />
      </g>
    </svg>
  );
}
