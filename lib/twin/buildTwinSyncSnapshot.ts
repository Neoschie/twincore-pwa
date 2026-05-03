import type { CrewStatus, ExitState, PartyLive, TwinSyncSnapshot } from "./types";

function getMinutesSince(value?: string | null) {
  if (!value) return 999;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 999;
  return Math.floor((Date.now() - time) / 60000);
}

export function buildTwinSyncSnapshot({
  live,
  crew,
  environmentLevel,
  exitState,
}: {
  live: PartyLive | null;
  crew: CrewStatus[];
  environmentLevel: string;
  exitState: ExitState | null;
}): TwinSyncSnapshot {
  const staleCount = crew.filter((member) => getMinutesSince(member.updatedAt) > 20).length;

  const allSeparated =
    crew.length > 0 &&
    crew.every((member) => {
      const status = member.status?.toLowerCase() ?? "";
      return (
        status.includes("away") ||
        status.includes("offline") ||
        status.includes("separated")
      );
    });

    return {
    party: live
      ? {
          active: Boolean(live.active),
          status: live.status ?? null,
          heartbeatBpm: live.heartbeatBpm ?? live.bpm ?? null,
          vibeLabel: live.vibeLabel ?? null,
        }
      : null,

    crew: {
      count: crew.length,
      staleCount,
      allSeparated,
    },

    spots: {
      environmentLevel,
    },

    exit: exitState
      ? {
          active: Boolean(exitState.active),
          headingHome: Boolean(exitState.headingHome),
          alone: Boolean(exitState.alone),
        }
      : null,

    desync: {
      level: allSeparated ? "separated" : staleCount > 0 ? "drifting" : "synced",
    },

    noSupport: {
      active: crew.length === 0 || allSeparated,
    },

    crewCollapse: {
      level: allSeparated ? "collapsing" : staleCount > 0 ? "weakening" : "stable",
    },
  };
}