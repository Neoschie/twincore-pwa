import type { CrewMember } from "@/app/types/crew";
export function calculateCrewCohesion(
  crew: CrewMember[]
): number {
  if (!crew.length) return 0;

  let score = 100;

  const disconnected =
    crew.filter((m) => !m.locationEnabled).length;

  score -= disconnected * 10;

  const risky =
    crew.filter((m) => m.riskScore > 50).length;

  score -= risky * 15;

  return Math.max(score, 0);
}