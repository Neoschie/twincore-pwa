type PresenceBadgeProps = {
  label: string;
  color?: "purple" | "green" | "cyan";
};

export function PresenceBadge({
  label,
  color = "purple",
}: PresenceBadgeProps) {
  const styles = {
    purple:
      "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100",
    green:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    cyan:
      "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] backdrop-blur-xl ${styles[color]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
      {label}
    </div>
  );
}