"use client";

import { useEffect, useState, type ReactNode } from "react";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  index?: number;
  delayClass?: string;
};

export default function AnimatedCard({
  children,
  className = "",
  index = 0,
  delayClass = "",
}: AnimatedCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const delay = 80 + index * 80;

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={[
        "transform transition-all duration-700 ease-out",
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-6 scale-[0.98] opacity-0",
        className,
        delayClass,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
