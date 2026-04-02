export type InviteStatus = "pending" | "accepted" | "expired";

export type InviteRecord = {
  code: string;
  inviterName: string;
  crewName: string;
  createdAt: string;
  acceptedAt?: string;
  expiresAt?: string;
  status: InviteStatus;
};

const STORAGE_KEY = "twincore_invites";
const CREW_STORAGE_KEY = "twincore_joined_crew";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function normalizeInviteCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

export function generateInviteCode(seed = "TC") {
  const partA = Math.random().toString(36).slice(2, 6).toUpperCase();
  const partB = Date.now().toString(36).slice(-4).toUpperCase();
  return `${seed}-${partA}${partB}`;
}

export function readLocalInvites(): InviteRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InviteRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalInvites(invites: InviteRecord[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invites));
}

export function getInviteByCode(code: string) {
  const safeCode = normalizeInviteCode(code);
  return readLocalInvites().find((invite) => invite.code === safeCode) ?? null;
}

export function saveInviteLocally(invite: InviteRecord) {
  const invites = readLocalInvites();
  const existingIndex = invites.findIndex((item) => item.code === invite.code);

  if (existingIndex >= 0) {
    invites[existingIndex] = invite;
  } else {
    invites.unshift(invite);
  }

  writeLocalInvites(invites);
}

export function createLocalInvite(inviterName: string, crewName: string) {
  const invite: InviteRecord = {
    code: generateInviteCode("TC"),
    inviterName: inviterName.trim() || "Neo",
    crewName: crewName.trim() || "TwinCore Crew",
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  saveInviteLocally(invite);
  return invite;
}

export function acceptLocalInvite(code: string) {
  const safeCode = normalizeInviteCode(code);
  const invites = readLocalInvites();
  const inviteIndex = invites.findIndex((item) => item.code === safeCode);

  if (inviteIndex === -1) return null;

  const updatedInvite: InviteRecord = {
    ...invites[inviteIndex],
    acceptedAt: new Date().toISOString(),
    status: "accepted",
  };

  invites[inviteIndex] = updatedInvite;
  writeLocalInvites(invites);

  if (canUseStorage()) {
    localStorage.setItem(
      CREW_STORAGE_KEY,
      JSON.stringify({
        inviteCode: updatedInvite.code,
        crewName: updatedInvite.crewName,
        inviterName: updatedInvite.inviterName,
        joinedAt: updatedInvite.acceptedAt,
      }),
    );
  }

  return updatedInvite;
}

export function getJoinedCrew() {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(CREW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      inviteCode: string;
      crewName: string;
      inviterName: string;
      joinedAt: string;
    };
  } catch {
    return null;
  }
}

export function isInviteExpired(expiresAt?: string) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function buildInviteLink(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/invite/${normalizeInviteCode(code)}`;
}