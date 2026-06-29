import { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
};

export function GlassPanel({
  children,
  className = "",
}: GlassPanelProps) {
  return (
    <div
      className={`
        rounded-[28px]
        border
        border-white/10
        bg-white/[0.045]
        backdrop-blur-2xl
        shadow-[0_0_45px_rgba(0,0,0,0.18)]
        transition-all
        duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
}