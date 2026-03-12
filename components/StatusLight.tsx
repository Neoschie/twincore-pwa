import { CrewStatus } from "@/data/mockCircle";

const colors: Record<CrewStatus, string> = {
  not_joined: "#FFFFFF",
  preparing: "#FACC15",
  ready: "#22C55E",
  out: "#3B82F6",
  support: "#A855F7",
  heading_home: "#F97316",
  home_safe: "#16A34A",
  offline: "#9CA3AF",
};

export default function StatusLight({
  status,
  size = 12,
}: {
  status: CrewStatus;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[status],
        border: "1px solid #2A2A2A",
      }}
    />
  );
}