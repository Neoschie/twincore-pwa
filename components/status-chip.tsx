type Tone = "red" | "orange" | "blue" | "green" | "emerald" | "cyan" | "neutral";

type StatusChipProps = {
  label: string;
  tone?: Tone;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  red: "bg-red-500/15 text-red-100 shadow-[0_6px_20px_rgba(239,68,68,0.18)]",
  orange: "bg-orange-500/15 text-orange-100 shadow-[0_6px_20px_rgba(249,115,22,0.16)]",
  blue: "bg-blue-500/15 text-blue-100 shadow-[0_6px_20px_rgba(59,130,246,0.16)]",
  green: "bg-emerald-500/15 text-emerald-100 shadow-[0_6px_20px_rgba(16,185,129,0.16)]",
  emerald: "bg-emerald-500/15 text-emerald-100 shadow-[0_6px_20px_rgba(16,185,129,0.16)]",
  cyan: "bg-cyan-500/15 text-cyan-100 shadow-[0_6px_20px_rgba(34,211,238,0.16)]",
  neutral: "bg-white/10 text-white/80 shadow-[0_6px_20px_rgba(255,255,255,0.05)]",
};

export default function StatusChip({
  label,
  tone = "blue",
  className = "",
}: StatusChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
