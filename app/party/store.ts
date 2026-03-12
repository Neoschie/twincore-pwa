"use client";

export type CrewStatus =
  | "At Party"
  | "Preparing"
  | "Heading Home"
  | "Home Safe";

export type CrewMember = {
  id: number;
  name: string;
  status: CrewStatus;
};

const CREW_KEY = "party_mode_crew";

const defaultCrew: CrewMember[] = [{ id: 1, name: "Neo", status: "Home Safe" }];

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getCrew(): CrewMember[] {
  if (!canUseStorage()) return defaultCrew;

  const raw = window.localStorage.getItem(CREW_KEY);

  if (!raw) {
    window.localStorage.setItem(CREW_KEY, JSON.stringify(defaultCrew));
    return defaultCrew;
  }

  try {
    const parsed = JSON.parse(raw) as CrewMember[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(CREW_KEY, JSON.stringify(defaultCrew));
      return defaultCrew;
    }
    return parsed;
  } catch {
    window.localStorage.setItem(CREW_KEY, JSON.stringify(defaultCrew));
    return defaultCrew;
  }
}

function saveCrew(crew: CrewMember[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CREW_KEY, JSON.stringify(crew));
}

export function addCrewMember(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const crew = getCrew();

  const alreadyExists = crew.some(
    (member) => member.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (alreadyExists) return;

  const updated = [
    ...crew,
    {
      id: Date.now(),
      name: trimmed,
      status: "Preparing" as CrewStatus,
    },
  ];

  saveCrew(updated);
}

export function updateCrewStatus(name: string, status: CrewStatus) {
  const crew = getCrew();

  const updated = crew.map((member) =>
    member.name === name ? { ...member, status } : member
  );

  saveCrew(updated);
}

export function clearCrew() {
  saveCrew(defaultCrew);
}