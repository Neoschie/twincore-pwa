export type AwarenessLevel = "low" | "guarded" | "elevated" | "critical";
export type DesyncLevel = "synced" | "drifting" | "separated";
export type DriftLevel = "none" | "elevated" | "prolonged";
export type CrewCollapseLevel = "stable" | "thinning" | "collapsing";
export type TrajectoryLevel = "steady" | "approaching" | "imminent";
export type TrajectoryRiskWindow = "none" | "approaching" | "imminent";

export type PartyLive = {
  active?: boolean;
  status?: string | null;
  vibeLabel?: string | null;
  energy?: number | null;
  bpm?: number | null;
  heartbeatBpm?: number | null;
  intensity?: "low" | "medium" | "high" | null;

latitude?: number;
  longitude?: number;
  timestamp?: string;
};

export type CrewStatus = {
  id?: string;
  name: string;
  status?: string | null;
  vibeLabel?: string | null;
  heartbeatBpm?: number | null;
  updatedAt?: string | null;
  locationName?: string | null;

  latitude?: number;
  longitude?: number;
};

export type SpotSignal = {
  id?: string;
  name: string;
  energy?: number | null;
  crowdedness?: "low" | "medium" | "high" | null;
  safetyTone?: "safe" | "mixed" | "risky" | null;
  isNearby?: boolean;
};

export type ExitState = {
  active?: boolean;
  headingHome?: boolean;
  alone?: boolean;
  etaMinutes?: number | null;
  arrived?: boolean;
};

export type TwinContextSnapshot = {
  party: PartyLive | null;
  crew: CrewStatus[];
  spots: SpotSignal[];
  exitState: ExitState | null;
};

export type AwarenessInsight = {
  score: number;
  level: AwarenessLevel;
};

export type CrewCollapseInsight = {
  level: CrewCollapseLevel;
  activeCount: number;
  staleCount: number;
};

export type TrajectoryInsight = {
  level: TrajectoryLevel;
  reason: string;
  riskWindow?: "none" | "approaching" | "imminent";
};

export type TwinSignals = {
  awareness: AwarenessInsight;
  desync: DesyncLevel;
  drift: DriftLevel;
  noSupportActive: boolean;
  crewCollapse: CrewCollapseInsight;
  trajectory: TrajectoryInsight;
  learnMe?: {
    label?: string; 
    decisiveness?: number;
    resistance?: number;
    sensitivity?: number;
    riskTolerance?: number;
    consistency?: number;
  };
};

export type TwinSyncSnapshot = {
  party: {
    active: boolean;
    status?: string | null;
    heartbeatBpm?: number | null;
    vibeLabel?: string | null;
  } | null;

  crew: {
    count: number;
    staleCount: number;
    allSeparated: boolean;
  };

  spots: {
    environmentLevel: string;
  };

  exit: {
    active: boolean;
    headingHome: boolean;
    alone: boolean;
  } | null;

desync: {
  level: "synced" | "drifting" | "separated";
};

noSupport: {
  active: boolean;
};

crewCollapse?: {
  level?: "stable" | "weakening" | "collapsing";
 };
};