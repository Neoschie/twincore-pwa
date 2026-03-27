type Tone = "red" | "orange" | "blue" | "green" | "emerald" | "cyan" | "neutral";

type StatusChipProps = {
  label: string;
  tone?: Tone;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  red: "border-red-400/25 bg-red-500/15 text-red-100",
  orange: "border-orange-400/25 bg-orange-500/15 text-orange-100",
  blue: "border-blue-400/25 bg-blue-500/15 text-blue-100",
  green: "border-emerald-400/25 bg-emerald-500/15 text-emerald-100",
  emerald: "border-emerald-400/25 bg-emerald-500/15 text-emerald-100",
  cyan: "border-cyan-400/25 bg-cyan-500/15 text-cyan-100",
  neutral: "border-white/10 bg-white/5 text-white/75",
};

export default function StatusChip({
  label,
  tone = "blue",
  className = "",
}: StatusChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}