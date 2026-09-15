"use client";

import { useMemo } from "react";

type OrbParticlesProps = {
  active: boolean;
};

export default function OrbParticles({
  active,
}: OrbParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        index,
        duration: 1600 + ((index * 113) % 1800),
        delay: -((index * 137) % 2600),
        distance: 48 + ((index * 11) % 18),
      })),
    []
  );

  return (
    <div
      className={`tc-orb__particles ${
        active ? "is-active" : "is-paused"
      }`}
      aria-hidden="true"
    >
      {particles.map(({ index, duration, delay, distance }) => (
        <i
          key={index}
          style={
            {
              "--particle-index": index,
              "--particle-count": particles.length,
              "--particle-duration": `${duration}ms`,
              "--particle-delay": `${delay}ms`,
              "--particle-distance": `${distance}%`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
