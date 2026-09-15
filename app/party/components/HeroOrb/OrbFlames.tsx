"use client";

import { useMemo } from "react";

type OrbFlamesProps = {
  active: boolean;
};

export default function OrbFlames({
  active,
}: OrbFlamesProps) {
  const flames = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const gap =
          index === 4 ||
          index === 5 ||
          index === 13 ||
          index === 22 ||
          index === 30;

        return {
          index,
          hidden: gap,
          height: 14 + ((index * 23) % 46),
          width: 3 + ((index * 11) % 7),
          delay: -((index * 97) % 1900),
          duration: 760 + ((index * 149) % 900),
          offset: -4 + ((index * 13) % 9),
          tilt: -12 + ((index * 17) % 25),
        };
      }),
    []
  );

  return (
    <div
      className={`tc-orb__flames ${
        active ? "is-active" : "is-paused"
      }`}
      aria-hidden="true"
    >
      {flames.map(
        ({
          index,
          hidden,
          height,
          width,
          delay,
          duration,
          offset,
          tilt,
        }) =>
          hidden ? null : (
            <i
              key={index}
              style={
                {
                  "--flame-index": index,
                  "--flame-count": flames.length,
                  "--flame-height": `${height}px`,
                  "--flame-width": `${width}px`,
                  "--flame-delay": `${delay}ms`,
                  "--flame-duration": `${duration}ms`,
                  "--flame-offset": `${offset}px`,
                  "--flame-tilt": `${tilt}deg`,
                } as React.CSSProperties
              }
            />
          )
      )}
    </div>
  );
}