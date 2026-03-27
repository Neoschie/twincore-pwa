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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const delay = 60 + index * 60;

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={`rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl backdrop-blur-sm transition-all duration-500 hover:-translate-y-[1px] hover:bg-white/[0.07] ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${delayClass} ${className}`}
    >
      {children}
    </div>
  );
}
