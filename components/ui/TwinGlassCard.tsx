import type { ReactNode } from "react";

type TwinGlassCardProps = {
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "fuchsia" | "emerald" | "amber";
};

const accentMap = {
  cyan: "border-cyan-300/15 shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_42px_rgba(34,211,238,0.08)]",
  fuchsia: "border-fuchsia-300/15 shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_42px_rgba(217,70,239,0.08)]",
  emerald: "border-emerald-300/15 shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_42px_rgba(52,211,153,0.08)]",
  amber: "border-amber-300/15 shadow-[0_20px_70px_rgba(0,0,0,0.28),0_0_42px_rgba(251,191,36,0.08)]",
};

export function TwinGlassCard({
  children,
  className = "",
  accent = "cyan",
}: TwinGlassCardProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[1.75rem] border bg-[#0a1018]/72",
        "backdrop-blur-2xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        accentMap[accent],
        className,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      {children}
    </div>
  );
}
