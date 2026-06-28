"use client";

type Props = {
  count?: number;
};

export function PresenceParticles({
  count = 14,
}: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {

        const size = 2 + (i % 4);

        const left = 8 + ((i * 17) % 84);

        const top = 10 + ((i * 13) % 78);

        const delay = i * 0.7;

        const duration = 7 + (i % 5);

        return (
          <span
            key={i}
            className="absolute rounded-full bg-cyan-300/70 animate-presenceParticle"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );

      })}
    </>
  );
}