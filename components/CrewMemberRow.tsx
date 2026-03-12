import StatusLight from "@/components/StatusLight";
import { CrewMember } from "@/data/mockCircle";

function formatStatus(status: CrewMember["status"]) {
  switch (status) {
    case "not_joined":
      return "Not joined";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "out":
      return "Out";
    case "support":
      return "Needs Support";
    case "heading_home":
      return "Heading Home";
    case "home_safe":
      return "Home Safe";
    case "offline":
      return "Offline";
    default:
      return status;
  }
}

export default function CrewMemberRow({
  member,
  currentUserId,
}: {
  member: CrewMember;
  currentUserId?: string | null;
}) {
  const initials = member.name.slice(0, 1).toUpperCase();
  const isYou = currentUserId === member.id;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: "1px solid #1F1F1F",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#1E293B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            color: "white",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {member.name}
            {isYou ? " (You)" : ""}
          </div>

          <div
            style={{
              color: "#A1A1AA",
              fontSize: 13,
            }}
          >
            {formatStatus(member.status)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {typeof member.batteryLevel === "number" ? (
          <span
            style={{
              color: "#A1A1AA",
              fontSize: 12,
            }}
          >
            {member.batteryLevel}%
          </span>
        ) : null}

        <StatusLight status={member.status} />
      </div>
    </div>
  );
}