"use client";

type OrbEnergyRingProps = {
  active: boolean;
  score: number;
};

export default function OrbEnergyRing({
  active,
  score,
}: OrbEnergyRingProps) {
  const intensity = Math.max(0.35, Math.min(score / 100, 1));

  return (
    <svg
      className={`tc-energy-ring ${
        active ? "is-active" : "is-paused"
      }`}
      viewBox="0 0 300 300"
      aria-hidden="true"
      style={
        {
          "--ring-intensity": intensity,
        } as React.CSSProperties
      }
    >
      <defs>
        <linearGradient
          id="tcEnergyGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ff27d8" />
          <stop offset="38%" stopColor="#d73cff" />
          <stop offset="68%" stopColor="#6648ff" />
          <stop offset="100%" stopColor="#00a8ff" />
        </linearGradient>

        <filter
          id="tcEnergyDistortion"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.08"
            numOctaves="3"
            seed="9"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="7s"
              values="0.015 0.08;0.025 0.12;0.012 0.07;0.015 0.08"
              repeatCount="indefinite"
            />
          </feTurbulence>

          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="18"
            xChannelSelector="R"
            yChannelSelector="B"
          />

          <feGaussianBlur
            stdDeviation="1.4"
            result="softGlow"
          />

          <feMerge>
            <feMergeNode in="softGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter
          id="tcEnergyOuterGlow"
          x="-70%"
          y="-70%"
          width="240%"
          height="240%"
        >
          <feGaussianBlur
            stdDeviation="7"
            result="blur"
          />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        className="tc-energy-ring__halo"
        cx="150"
        cy="150"
        r="111"
      />

      <circle
        className="tc-energy-ring__plasma tc-energy-ring__plasma--outer"
        cx="150"
        cy="150"
        r="103"
        filter="url(#tcEnergyOuterGlow)"
      />

      <circle
        className="tc-energy-ring__plasma tc-energy-ring__plasma--main"
        cx="150"
        cy="150"
        r="99"
        filter="url(#tcEnergyDistortion)"
      />

      <circle
        className="tc-energy-ring__plasma tc-energy-ring__plasma--inner"
        cx="150"
        cy="150"
        r="91"
      />

      <g className="tc-energy-ring__flare-group">
        <path
          className="tc-energy-ring__flare tc-energy-ring__flare--one"
          d="M82 70 C72 44, 88 28, 106 50 C100 25, 126 20, 128 55"
        />

        <path
          className="tc-energy-ring__flare tc-energy-ring__flare--two"
          d="M213 65 C228 38, 248 43, 236 72 C255 58, 270 78, 240 92"
        />

        <path
          className="tc-energy-ring__flare tc-energy-ring__flare--three"
          d="M231 207 C263 212, 264 237, 235 232 C249 252, 222 267, 211 235"
        />

        <path
          className="tc-energy-ring__flare tc-energy-ring__flare--four"
          d="M72 214 C45 232, 33 211, 62 197 C35 194, 35 168, 68 177"
        />
      </g>
    </svg>
  );
}
