import { ReactNode } from "react";

type MessageBubbleProps = {
  role: "user" | "twin";
  activeAlert?: boolean;
  children: ReactNode;
};

export function MessageBubble({
  role,
  activeAlert = false,
  children,
}: MessageBubbleProps) {
  const base =
    "max-w-[82%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 transition-all";

  const styles =
    role === "user"
      ? "border border-white/[0.07] bg-white/[0.065] text-white ml-auto"
      : activeAlert
        ? "border border-red-400/30 bg-red-500/15 animate-pulse text-white"
        : "border border-cyan-300/15 bg-cyan-500/10 text-white";

  return (
    <div className={`${base} ${styles}`}>
      {children}
    </div>
  );
}