import { ReactNode } from "react";

type MessageBubbleProps = {
  role: "user" | "twin";
  children: ReactNode;
};

export function MessageBubble({
  role,
  children,
}: MessageBubbleProps) {
  const base =
    "rounded-2xl px-4 py-3 max-w-[78%] shadow-sm transition-all";

  const styles =
    role === "user"
      ? "bg-white/10 text-white ml-auto"
      : "border border-cyan-300/15 bg-cyan-500/10 text-white";

  return (
    <div className={`${base} ${styles}`}>
      {children}
    </div>
  );
}