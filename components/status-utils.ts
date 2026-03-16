export function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "safe") {
    return {
      dot: "#22C55E",
      label: "Safe",
      level: "good",
    };
  }

  if (normalized === "drinking") {
    return {
      dot: "#F59E0B",
      label: "Drinking",
      level: "watch",
    };
  }

  if (
    normalized === "listening to music" ||
    normalized === "watching netflix"
  ) {
    return {
      dot: "#3B82F6",
      label: status,
      level: "chill",
    };
  }

  if (normalized === "heading home") {
    return {
      dot: "#8B5CF6",
      label: "Heading home",
      level: "move",
    };
  }

  if (normalized === "outside" || normalized === "at club") {
    return {
      dot: "#EC4899",
      label: status,
      level: "active",
    };
  }

  if (normalized === "not active") {
    return {
      dot: "#EF4444",
      label: "No update",
      level: "warning",
    };
  }

  return {
    dot: "#A1A1AA",
    label: status,
    level: "neutral",
  };
}

export function formatTimeAgo(updatedAt?: string) {
  if (!updatedAt) return "No recent check-in";

  const now = new Date().getTime();
  const then = new Date(updatedAt).getTime();

  if (Number.isNaN(then)) return "No recent check-in";

  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  if (diffHr < 24) return `${diffHr} hrs ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

export function isStaleCheckIn(updatedAt?: string, staleMinutes = 45) {
  if (!updatedAt) return true;

  const now = new Date().getTime();
  const then = new Date(updatedAt).getTime();

  if (Number.isNaN(then)) return true;

  return now - then > staleMinutes * 60000;
}