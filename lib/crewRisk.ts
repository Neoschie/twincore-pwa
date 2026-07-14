import { CrewMember } from "@/types/crew";

export function calculateCrewRisk(
  member: CrewMember
): number {
  let risk = 0;

  if (!member.locationEnabled) risk += 20;

  if (member.batteryLevel < 20) risk += 25;

  if (member.status === "needs_help") risk += 100;

  const minutesSinceSeen =
    (Date.now() -
      new Date(member.lastSeen).getTime()) /
    1000 /
    60;

  if (minutesSinceSeen > 30) risk += 20;

  if (minutesSinceSeen > 60) risk += 40;

  return Math.min(risk, 100);
}