"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  MapPin,
  Radio,
  Route,
  Siren,
  Users,
  EyeOff,
  Ghost,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  HomeIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getActiveCrew } from "@/lib/crew-system";
import { getSharedProfile } from "@/lib/shared-profile";
import { calculateDistanceKm } from "@/lib/distance";
import StatusChip from "../_components/status-chip";
import PageHeader from "../_components/page-header";
import GlobalStatusBar from "../_components/global-status-bar";
import AnimatedCard from "../_components/animated-card";

import AuthGuard from "@/components/auth/AuthGuard";
import CrewIdentityCard from "./CrewIdentityCard";
import { TwinSituation } from "@/components/twincore/ui/TwinSituation";
import { TwinPrimaryAction } from "@/components/twincore/ui/TwinPrimaryAction";
import { TwinSection } from "@/components/twincore/ui/TwinSection";
import { TwinHero } from "@/components/twincore/ui/TwinHero";
import { TwinOrb } from "@/components/twincore/ui/TwinOrb";
import { TwinPresenceMap } from "@/components/twincore/ui/TwinPresenceMap";
import { useTonightContext } from "@/hooks/twinme/useTonightContext";

const getProfileStorageKey = (userId: string) => `twincore_profile_${userId}`;

type CrewStatusRow = {
  id?: string;
  user_id?: string | null;
  crew_id?: string | null;
  name?: string | null;
  status?: string | null;
  heartbeat_bpm?: number | null;
  vibe_label?: string | null;
  location_name?: string | null;
  updated_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type TwinMeMemoryRow = {
  id: string;
  user_id: string;
  crew_id?: string | null;
  memory_type: string;
  title: string;
  summary: string;
  confidence: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type CrewCheckinRow = {
  id: string;
  crew_id: string;
  user_id: string;
  status: string;
  vibe_label?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
};

type CrewMemberRow = {
  id: string;
  user_id?: string | null;
  crew_id?: string | null;
  invite_code?: string | null;
  display_name?: string | null;
  crew_name?: string | null;
  member_name?: string | null;
  crew_owner?: string | null;
  joined_at?: string | null;
};

type FilterMode = "all" | "active" | "heading-home";

type PrivacySettings = {
  displayName: string;
  ghostMode: boolean;
  ghostLabel: string;
  blurPresence: boolean;
  trustedOnly: boolean;
  trustedList: string[];
};

const defaultPrivacy: PrivacySettings = {
  displayName: "Crew Member",
  ghostMode: false,
  ghostLabel: "Low Visibility",
  blurPresence: true,
  trustedOnly: false,
  trustedList: [],
};

function timeAgo(input?: string | null) {
  if (!input) return "No update";
  const then = new Date(input).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

function isFlaggedRow(row: CrewStatusRow) {
  const s = (row.status || "").toLowerCase();
  const v = (row.vibe_label || "").toLowerCase();

  return (
    s.includes("alert") ||
    s.includes("danger") ||
    s.includes("help") ||
    v.includes("alert") ||
    v.includes("danger") ||
    v.includes("help")
  );
}

function getRowTone(
  row: CrewStatusRow,
): "red" | "cyan" | "orange" | "active" | "neutral" {
  const status = (row.status || "").toLowerCase();

  if (isFlaggedRow(row)) return "red";
  if (status === "heading home") return "cyan";
  if (status === "away" || status === "idle") return "orange";
  if (status === "active") return "active";
  return "neutral";
}

function getRadarPointClass(row: CrewStatusRow) {
  const tone = getRowTone(row);

  if (tone === "red") {
    return {
      dot: "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]",
      ring: "border-red-400/40",
      pulse: "animate-ping",
      label: "text-red-100",
    };
  }

  if (tone === "cyan") {
    return {
      dot: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.8)]",
      ring: "border-cyan-300/40",
      pulse: "animate-pulse",
      label: "text-cyan-100",
    };
  }

  if (tone === "orange") {
    return {
      dot: "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.8)]",
      ring: "border-orange-400/40",
      pulse: "animate-pulse",
      label: "text-orange-100",
    };
  }

  if (tone === "active") {
    return {
      dot: "bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.8)]",
      ring: "border-fuchsia-400/40",
      pulse: "animate-pulse",
      label: "text-fuchsia-100",
    };
  }

  return {
    dot: "bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.4)]",
    ring: "border-white/20",
    pulse: "",
    label: "text-white/80",
  };
}

function getMockRadarPosition(memberId: string, index: number, total: number) {
  let hash = 0;

  for (let i = 0; i < memberId.length; i++) {
    hash = (hash * 31 + memberId.charCodeAt(i)) >>> 0;
  }

  const angle = (hash % 360) * (Math.PI / 180);
  const radius = 16 + (hash % 14);

  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  };
}

function getPrivacySettings(userId: string): PrivacySettings {
  try {
    const raw = window.localStorage.getItem(getProfileStorageKey(userId));
    if (!raw) return defaultPrivacy;

    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      displayName: parsed.displayName || "Crew Member",
      ghostMode: parsed.ghostMode ?? false,
      ghostLabel: parsed.ghostLabel || "Low Visibility",
      blurPresence: parsed.blurPresence ?? true,
      trustedOnly: parsed.trustedOnly ?? false,
      trustedList: Array.isArray(parsed.trustedList) ? parsed.trustedList : [],
    };
  } catch {
    return defaultPrivacy;
  }
}


async function resolveCrewDisplayName(userId: string) {
  const sharedProfile = await getSharedProfile(userId);

  if (sharedProfile?.display_name?.trim()) {
    return sharedProfile.display_name.trim();
  }

  const cachedProfile = getPrivacySettings(userId);

  return cachedProfile.displayName.trim() || "Crew Member";
}

function canSeeFull(row: CrewStatusRow, privacy: PrivacySettings) {
  if (!privacy.trustedOnly) return true;

  const rowName = (row.name || "").trim().toLowerCase();
  const selfName = privacy.displayName.trim().toLowerCase();

  if (rowName && rowName === selfName) return true;

  return privacy.trustedList.some(
    (name) => name.trim().toLowerCase() === rowName,
  );
}

function getDisplayRow(
  row: CrewStatusRow,
  privacy: PrivacySettings,
): CrewStatusRow {
  if (canSeeFull(row, privacy)) return row;

  return {
    ...row,
    status: "Trusted Only",
    vibe_label: privacy.ghostLabel || "Low Visibility",
    location_name: "Hidden",
  };
}

function dedupeCrewRows(rows: CrewStatusRow[]) {
  const seen = new Set<string>();
  const deduped: CrewStatusRow[] = [];

  for (const row of rows) {
    const key = `${(row.name || "").trim().toLowerCase()}::${(row.status || "")
      .trim()
      .toLowerCase()}::${(row.location_name || "").trim().toLowerCase()}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }

  return deduped;
}

export default function CrewPage() {
  // TWINCORE_CREW_PARTY_CONTEXT_BRIDGE_R13_0
  const { tonight } = useTonightContext();

  const [crewRows, setCrewRows] = useState<CrewStatusRow[]>([]);
  const [crewMessage, setCrewMessage] = useState("Checking crew pulse...");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [liveTick, setLiveTick] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);
  const inviteCode =
    "TWIN-" + (privacy.displayName || "CREW").slice(0, 4).toUpperCase();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // TWINCORE_CREW_TONIGHT_READ_R13_0
  //
  // Crew now reads the same ephemeral Tonight Context used by
  // Party + Fit Intelligence.
  //
  // UNKNOWN remains null. No context is fabricated here.
  const crewTonightRead = useMemo(() => {
    const destination = tonight.destination ?? tonight.venue ?? null;

    const vibe = tonight.vibeLabel ?? null;

    const occasion = tonight.occasion ?? null;

    const desiredFeeling = tonight.desiredFeeling ?? null;

    const fitLocked = Boolean(tonight.fit?.locked);

    const fitMove = tonight.fit?.swagMove ?? null;

    const partyCrewCount =
      typeof tonight.crew?.count === "number" ? tonight.crew.count : null;

    const connectedCrewCount =
      typeof tonight.crew?.connected === "number"
        ? tonight.crew.connected
        : null;

    const hasTonightContext = Boolean(
      destination ||
      vibe ||
      occasion ||
      desiredFeeling ||
      fitLocked ||
      fitMove ||
      partyCrewCount !== null ||
      connectedCrewCount !== null,
    );

    return {
      destination,
      vibe,
      occasion,
      desiredFeeling,
      fitLocked,
      fitMove,
      partyCrewCount,
      connectedCrewCount,
      hasTonightContext,
    };
  }, [
    tonight.destination,
    tonight.venue,
    tonight.vibeLabel,
    tonight.occasion,
    tonight.desiredFeeling,
    tonight.fit?.locked,
    tonight.fit?.swagMove,
    tonight.crew?.count,
    tonight.crew?.connected,
  ]);

  const [memoryTimeline, setMemoryTimeline] = useState<TwinMeMemoryRow[]>([]);

  const [crewCheckins, setCrewCheckins] = useState<CrewCheckinRow[]>([]);

  async function loadCrewCheckins() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCrewCheckins([]);
      return;
    }

    await loadTwinMeMemories(user.id);

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) {
      setCrewCheckins([]);
      return;
    }

    const { data, error } = await supabase
      .from("crew_checkins")
      .select("*")
      .eq("crew_id", activeCrew.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("CREW TIMELINE LOAD ERROR:", error);
      return;
    }

    setCrewCheckins(Array.isArray(data) ? (data as CrewCheckinRow[]) : []);
  }

  async function loadTwinMeMemories(userId: string) {
    const { data, error } = await supabase
      .from("twinme_memories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("MEMORY LOAD ERROR:", error);
      return;
    }

    setMemoryTimeline(Array.isArray(data) ? (data as TwinMeMemoryRow[]) : []);
  }

  async function loadCrewSignals() {
    if (!supabase) {
      setCrewRows([]);
      setCrewMessage("Crew connection unavailable");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCrewRows([]);
      setCrewMessage("Please sign in to see your crew.");
      return;
    }

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) {
      setCrewRows([]);
      setCrewMessage("No active crew connected.");
      return;
    }

    const [
      { data: statusData, error: statusError },
      { data: membersData, error: membersError },
    ] = await Promise.all([
      supabase
        .from("crew_status")
        .select("*")
        .eq("crew_id", activeCrew.id)
        .order("updated_at", { ascending: false }),

      supabase
        .from("crew_members")
        .select("*")
        .eq("crew_id", activeCrew.id)
        .order("id", { ascending: false }),
    ]);

    if (membersError) console.error("MEMBERS ERROR:", membersError);
    if (statusError) console.error("STATUS ERROR:", statusError);

    const statuses =
      !statusError && Array.isArray(statusData)
        ? (statusData as CrewStatusRow[])
        : [];

    const members =
      !membersError && Array.isArray(membersData)
        ? (membersData as CrewMemberRow[])
        : [];

    const statusByUserId = new Map<string, CrewStatusRow>();

    for (const statusRow of statuses) {
      if (!statusRow.user_id) continue;

      const existing = statusByUserId.get(statusRow.user_id);
      const existingTime = new Date(existing?.updated_at || 0).getTime();
      const nextTime = new Date(statusRow.updated_at || 0).getTime();

      if (!existing || nextTime >= existingTime) {
        statusByUserId.set(statusRow.user_id, statusRow);
      }
    }

    const now = Date.now();

    const mergedRows: CrewStatusRow[] = members.map((member) => {
      const liveStatus = member.user_id
        ? statusByUserId.get(member.user_id)
        : undefined;

      const updatedAt = liveStatus?.updated_at || member.joined_at || null;

      const updatedTime = updatedAt ? new Date(updatedAt).getTime() : 0;

      const ageMinutes =
        updatedTime > 0
          ? Math.floor((now - updatedTime) / 60000)
          : Number.POSITIVE_INFINITY;

      const isUrgent =
        liveStatus?.status === "help" || liveStatus?.status === "heading home";

      const derivedStatus = !liveStatus
        ? "inactive"
        : isUrgent
          ? liveStatus.status
          : ageMinutes > 10
            ? "inactive"
            : ageMinutes > 2
              ? "away"
              : liveStatus.status || "active";

      const derivedVibe = !liveStatus
        ? "Offline"
        : isUrgent
          ? liveStatus.vibe_label
          : ageMinutes > 10
            ? "Offline"
            : ageMinutes > 2
              ? "Away"
              : liveStatus.vibe_label || "Online";

      return {
        id: member.user_id || member.id,
        user_id: member.user_id,
        crew_id: member.crew_id,
        name:
          member.member_name ||
          member.display_name ||
          liveStatus?.name ||
          "Crew Member",
        status: derivedStatus,
        heartbeat_bpm: liveStatus?.heartbeat_bpm ?? null,
        vibe_label: derivedVibe,
        location_name:
          liveStatus?.location_name ||
          member.crew_name ||
          member.crew_owner ||
          "TwinCore Crew",
        updated_at: updatedAt,
        latitude: liveStatus?.latitude ?? null,
        longitude: liveStatus?.longitude ?? null,
      };
    });

    if (mergedRows.length > 0) {
      setCrewRows(mergedRows);
      setCrewMessage("Crew pulse connected");
      return;
    }

    setCrewRows([]);
    setCrewMessage(
      "No crew connected yet. TwinCore works best when your trusted people are connected. Invite trusted people to stay connected, share movement, and check in together.",
    );
  }
  async function pushCrewSignal(status: string, vibe: string) {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) {
      console.error("CREW STATUS ERROR: No active crew found.");
      return;
    }

    const authoritativeDisplayName =
      await resolveCrewDisplayName(user.id);

    const payload = {
      user_id: user.id,
      crew_id: activeCrew.id,
      name: authoritativeDisplayName,
      status,
      vibe_label: vibe,
      location_name: "Current Layer",
      updated_at: new Date().toISOString(),
    };

    const { data: existingRows, error: existingError } = await supabase
      .from("crew_status")
      .select("id")
      .eq("user_id", user.id)
      .eq("crew_id", activeCrew.id)
      .limit(1);

    if (existingError) {
      console.error("CREW EXISTING ERROR:", existingError);
      return;
    }

    if (existingRows && existingRows.length > 0) {
      const { data: updateData, error: updateError } = await supabase
        .from("crew_status")
        .update(payload)
        .eq("user_id", user.id)
        .eq("crew_id", activeCrew.id)
        .select();


      if (updateError) return;
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from("crew_status")
        .insert(payload)
        .select();


      if (insertError) return;
    }

    void loadCrewSignals();
  }

  async function publishCurrentLocation() {
    if (!navigator.geolocation) {
      console.error("CREW LOCATION ERROR: Geolocation is unavailable.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) return;

    const authoritativeDisplayName =
      await resolveCrewDisplayName(user.id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationPayload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_name: "Live Location",
          updated_at: new Date().toISOString(),
        };

        const { data: existingRows, error: lookupError } = await supabase
          .from("crew_status")
          .select("id")
          .eq("user_id", user.id)
          .eq("crew_id", activeCrew.id)
          .limit(1);

        if (lookupError) {
          console.error("CREW LOCATION LOOKUP ERROR:", lookupError);
          return;
        }

        if (existingRows && existingRows.length > 0) {
          const { error: updateError } = await supabase
            .from("crew_status")
            .update(locationPayload)
            .eq("id", existingRows[0].id);

          if (updateError) {
            console.error("CREW LOCATION UPDATE ERROR:", updateError);
            return;
          }
        } else {
          const { error: insertError } = await supabase
            .from("crew_status")
            .insert({
              user_id: user.id,
              crew_id: activeCrew.id,
              name: authoritativeDisplayName,
              status: "active",
              vibe_label: "Online",
              ...locationPayload,
            });

          if (insertError) {
            console.error("CREW LOCATION INSERT ERROR:", insertError);
            return;
          }
        }

        void loadCrewSignals();
      },
      (error) => {
        console.error("CREW GEOLOCATION ERROR:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }

  async function refreshCrewHeartbeat() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) return;

    const { error } = await supabase
      .from("crew_status")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("crew_id", activeCrew.id);

    if (error) {
      console.error("CREW HEARTBEAT ERROR:", error);
    }
  }

  useEffect(() => {
    async function loadUserPrivacy() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setCurrentUserId(user.id);

      const cachedPrivacy = getPrivacySettings(user.id);
      const authoritativeDisplayName =
        await resolveCrewDisplayName(user.id);

      setPrivacy({
        ...cachedPrivacy,
        displayName: authoritativeDisplayName,
      });
    }

    loadUserPrivacy();
    void loadCrewSignals();
    void loadCrewCheckins();

    void pushCrewSignal("active", "Online");
    void publishCurrentLocation();

    const pulseInterval = window.setInterval(() => {
      setLiveTick((prev) => !prev);
    }, 1800);

    const heartbeatInterval = window.setInterval(() => {
      void refreshCrewHeartbeat();
    }, 60000);

    const onStorage = () => {
      if (currentUserId) {
        setPrivacy(getPrivacySettings(currentUserId));
      }
    };

    window.addEventListener("storage", onStorage);

    const channel = supabase
      .channel("crew-ecosystem-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crew_status",
        },
        (payload) => {
          void loadCrewSignals();
          setLiveTick((prev) => !prev);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crew_members",
        },
        (payload) => {
          void loadCrewSignals();
          setLiveTick((prev) => !prev);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crew_checkins",
        },
        (payload) => {
          void loadCrewCheckins();
          setLiveTick((prev) => !prev);
        },
      )
      .subscribe((status) => {
      });

    return () => {
      window.clearInterval(pulseInterval);
      window.clearInterval(heartbeatInterval);
      window.removeEventListener("storage", onStorage);
      void supabase.removeChannel(channel);
    };
  }, []);

  const displayRows = useMemo(
    () => crewRows.map((row) => getDisplayRow(row, privacy)),
    [crewRows, privacy],
  );

  const homeCore = useMemo(() => {
    const selfWithCoordinates = displayRows.find(
      (row) =>
        row.id === currentUserId &&
        typeof row.latitude === "number" &&
        typeof row.longitude === "number",
    );

    const firstAvailableLocation = displayRows.find(
      (row) =>
        typeof row.latitude === "number" && typeof row.longitude === "number",
    );

    const anchor = selfWithCoordinates || firstAvailableLocation;

    if (
      !anchor ||
      typeof anchor.latitude !== "number" ||
      typeof anchor.longitude !== "number"
    ) {
      return null;
    }

    return {
      latitude: anchor.latitude,
      longitude: anchor.longitude,
    };
  }, [displayRows, currentUserId]);

  const crewStats = useMemo(() => {
    const headingHome = displayRows.filter(
      (r) => (r.status || "").toLowerCase() === "heading home",
    ).length;

    const flagged = displayRows.filter(isFlaggedRow).length;

    return {
      total: displayRows.length,
      headingHome,
      flagged,
    };
  }, [displayRows]);

  const crewMembersWithRisk = useMemo(() => {
    return displayRows.map((row) => {
      let risk = 0;

      const status = (row.status || "").toLowerCase();

      if (
        status.includes("help") ||
        status.includes("danger") ||
        status.includes("alert")
      ) {
        risk += 75;
      }

      if (status.includes("heading home")) {
        risk += 20;
      }

      if (!row.updated_at) {
        risk += 10;
      } else {
        const minutes =
          (Date.now() - new Date(row.updated_at).getTime()) / 1000 / 60;

        if (minutes > 30) risk += 10;
        if (minutes > 60) risk += 20;
      }

      const hasCoordinates =
        typeof row.latitude === "number" && typeof row.longitude === "number";

      const distanceKm =
        homeCore && hasCoordinates
          ? calculateDistanceKm(
              homeCore.latitude,
              homeCore.longitude,
              row.latitude as number,
              row.longitude as number,
            )
          : null;

      if (distanceKm !== null && distanceKm > 5) {
        risk += 15;
      }

      if (distanceKm !== null && distanceKm > 15) {
        risk += 20;
      }

      return {
        ...row,
        risk: Math.min(100, risk),
        distanceKm,
      };
    });
  }, [displayRows, homeCore]);

  const highestRisk = useMemo(() => {
    return Math.max(...crewMembersWithRisk.map((m) => m.risk), 0);
  }, [crewMembersWithRisk]);

  const geographicDrift = useMemo(() => {
    return crewMembersWithRisk.some(
      (member) => member.distanceKm !== null && member.distanceKm > 10,
    );
  }, [crewMembersWithRisk]);

  const desyncMetrics = useMemo(() => {
    const now = Date.now();

    const locatedMembers = displayRows.filter(
      (row) =>
        typeof row.latitude === "number" &&
        Number.isFinite(row.latitude) &&
        typeof row.longitude === "number" &&
        Number.isFinite(row.longitude),
    );

    const pairDistances: number[] = [];

    for (let i = 0; i < locatedMembers.length; i++) {
      for (let j = i + 1; j < locatedMembers.length; j++) {
        pairDistances.push(
          calculateDistanceKm(
            locatedMembers[i].latitude as number,
            locatedMembers[i].longitude as number,
            locatedMembers[j].latitude as number,
            locatedMembers[j].longitude as number,
          ),
        );
      }
    }

    const staleMemberCount = displayRows.filter((row) => {
      if (!row.updated_at) return true;

      const ageMinutes = (now - new Date(row.updated_at).getTime()) / 60000;

      return ageMinutes > 10;
    }).length;

    const missingLocationCount = displayRows.length - locatedMembers.length;

    const maxPairDistance =
      pairDistances.length > 0 ? Math.max(...pairDistances) : 0;

    const averagePairDistance =
      pairDistances.length > 0
        ? pairDistances.reduce((sum, value) => sum + value, 0) /
          pairDistances.length
        : 0;

    const fragmented =
      maxPairDistance > 15 ||
      staleMemberCount >= Math.ceil(displayRows.length / 2);

    const drifting =
      !fragmented &&
      (maxPairDistance > 5 || staleMemberCount > 0 || missingLocationCount > 0);

    return {
      staleMemberCount,
      missingLocationCount,
      maxPairDistance,
      averagePairDistance,
      fragmented,
      drifting,
    };
  }, [displayRows]);

  const cohesionScore = useMemo(() => {
    if (displayRows.length === 0) return 0;

    const riskPenalty = highestRisk * 0.3;
    const alertPenalty = crewStats.flagged * 12;
    const stalePenalty = desyncMetrics.staleMemberCount * 12;
    const missingLocationPenalty = desyncMetrics.missingLocationCount * 6;
    const separationPenalty = Math.min(35, desyncMetrics.maxPairDistance * 2);

    const score =
      100 -
      riskPenalty -
      alertPenalty -
      stalePenalty -
      missingLocationPenalty -
      separationPenalty;

    return Math.round(Math.max(0, Math.min(100, score)));
  }, [
    displayRows.length,
    highestRisk,
    crewStats.flagged,
    desyncMetrics.staleMemberCount,
    desyncMetrics.missingLocationCount,
    desyncMetrics.maxPairDistance,
  ]);

  const twinMeRecommendation = useMemo(() => {
    if (crewStats.flagged > 0 || highestRisk >= 75) {
      return "TwinMe detected an urgent crew signal. Immediate contact and location confirmation are recommended.";
    }

    if (desyncMetrics.fragmented) {
      return `TwinMe detects crew fragmentation. Maximum separation is ${desyncMetrics.maxPairDistance.toFixed(
        1,
      )} km and a group check-in is recommended.`;
    }

    if (desyncMetrics.drifting) {
      return `TwinMe detects early desync. ${desyncMetrics.staleMemberCount} stale signal${
        desyncMetrics.staleMemberCount === 1 ? "" : "s"
      } and ${desyncMetrics.missingLocationCount} missing location signal${
        desyncMetrics.missingLocationCount === 1 ? "" : "s"
      } are reducing cohesion.`;
    }

    if (crewStats.headingHome > 0) {
      return "TwinMe is monitoring safe separation as part of the crew begins heading home.";
    }

    if (crewStats.total > 1) {
      return `Crew signals are synchronized. Average member separation is ${desyncMetrics.averagePairDistance.toFixed(
        1,
      )} km.`;
    }

    return "TwinMe is awaiting more crew signals before evaluating desync.";
  }, [
    highestRisk,
    crewStats.flagged,
    crewStats.headingHome,
    crewStats.total,
    desyncMetrics,
  ]);

  const recommendationEngine = useMemo(() => {
    let action = "Continue monitoring";
    let priority = "Low";
    let confidence = 70;

    if (crewStats.flagged > 0 || highestRisk >= 75) {
      action = "Contact highest-risk crew member immediately";
      priority = "Critical";
      confidence = 98;
    } else if (desyncMetrics.fragmented) {
      action = "Regroup the crew";
      priority = "High";
      confidence = 94;
    } else if (desyncMetrics.drifting) {
      action = "Request crew check-in";
      priority = "Medium";
      confidence = 88;
    } else if (crewStats.headingHome > 0) {
      action = "Confirm safe arrival";
      priority = "Medium";
      confidence = 85;
    } else if (memoryTimeline.length > 0) {
      action = "Monitor learned behavior";
      priority = "Low";
      confidence = 82;
    }

    return {
      action,
      priority,
      confidence,
    };
  }, [crewStats, highestRisk, desyncMetrics, memoryTimeline]);

  const adaptiveLearning = useMemo(() => {
    const successfulRecommendations =
      recommendationEngine.priority === "Low"
        ? 1
        : recommendationEngine.priority === "Medium"
          ? 0.8
          : recommendationEngine.priority === "High"
            ? 0.6
            : 0.4;

    const learningScore = Math.round(successfulRecommendations * 100);

    const recommendationStrength =
      learningScore >= 85
        ? "Strong"
        : learningScore >= 65
          ? "Learning"
          : "Limited";

    return {
      learningScore,
      recommendationStrength,
      successfulRecommendations,
    };
  }, [recommendationEngine]);

  const recommendationFeedback = useMemo(() => {
    const accepted = memoryTimeline.filter(
      (m) => (m.memory_type || "").toLowerCase() === "recommendation",
    ).length;

    const ignored = Math.max(0, recommendationEngine.confidence > 90 ? 0 : 1);

    const successRate =
      accepted + ignored === 0
        ? 100
        : Math.round((accepted / (accepted + ignored)) * 100);

    const learningState =
      successRate >= 90
        ? "Optimizing"
        : successRate >= 70
          ? "Learning"
          : "Collecting";

    return {
      accepted,
      ignored,
      successRate,
      learningState,
    };
  }, [memoryTimeline, recommendationEngine]);

  const adaptiveDashboard = useMemo(() => {
    const learningProgress = adaptiveLearning.learningScore;

    const adaptationLevel =
      learningProgress >= 90
        ? "Advanced"
        : learningProgress >= 75
          ? "Learning"
          : "Developing";

    const recommendationAccuracy = Math.min(
      99,
      Math.round(recommendationEngine.confidence * 0.96),
    );

    const confidenceTrend =
      recommendationAccuracy >= 90
        ? "Increasing"
        : recommendationAccuracy >= 75
          ? "Stable"
          : "Training";

    return {
      learningProgress,
      adaptationLevel,
      recommendationAccuracy,
      confidenceTrend,
    };
  }, [adaptiveLearning, recommendationEngine]);

  const predictiveCrewInsight = useMemo(() => {
    const highestRiskMember =
      [...crewMembersWithRisk].sort(
        (a, b) => (b.risk ?? 0) - (a.risk ?? 0),
      )[0] ?? null;

    const trend =
      cohesionScore >= 85
        ? "Strengthening"
        : cohesionScore >= 60
          ? "Stable"
          : cohesionScore >= 40
            ? "Declining"
            : "Critical";

    const urgency =
      highestRisk >= 75 || desyncMetrics.fragmented
        ? "Immediate"
        : highestRisk >= 40 || desyncMetrics.drifting
          ? "Monitor"
          : "Low";

    const likelyNextEvent =
      highestRisk >= 75
        ? "Crew assistance may be required."
        : desyncMetrics.fragmented
          ? "Additional separation is likely."
          : crewStats.headingHome > 0
            ? "Crew will continue dispersing."
            : "Crew likely remains together.";

    return {
      trend,
      urgency,
      likelyNextEvent,
      highestRiskMember,
    };
  }, [
    crewMembersWithRisk,
    cohesionScore,
    highestRisk,
    desyncMetrics,
    crewStats.headingHome,
  ]);

  const confidenceFactors = useMemo(() => {
    const total = displayRows.length || 1;

    const freshSignals = total - desyncMetrics.staleMemberCount;

    const located = total - desyncMetrics.missingLocationCount;

    const score = Math.round(
      (freshSignals / total) * 40 +
        (located / total) * 30 +
        ((100 - highestRisk) / 100) * 30,
    );

    return {
      score,
      freshSignals,
      located,
      total,
    };
  }, [displayRows.length, desyncMetrics, highestRisk]);

  const threatAssessment = useMemo(() => {
    const recentHelpEvents = crewCheckins.filter((checkin) => {
      const status = (checkin.status || "").toLowerCase();
      const ageMinutes =
        (Date.now() - new Date(checkin.created_at).getTime()) / 60000;

      return status.includes("help") && ageMinutes <= 30;
    }).length;

    const stalePenalty = desyncMetrics.staleMemberCount * 12;
    const missingLocationPenalty = desyncMetrics.missingLocationCount * 8;
    const fragmentationPenalty = desyncMetrics.fragmented
      ? 25
      : desyncMetrics.drifting
        ? 12
        : 0;
    const distressPenalty = crewStats.flagged * 22;
    const repeatedHelpPenalty = Math.min(20, recentHelpEvents * 10);

    const threatScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          highestRisk * 0.35 +
            stalePenalty +
            missingLocationPenalty +
            fragmentationPenalty +
            distressPenalty +
            repeatedHelpPenalty,
        ),
      ),
    );

    const level =
      threatScore >= 80
        ? "Critical"
        : threatScore >= 60
          ? "High"
          : threatScore >= 35
            ? "Elevated"
            : "Low";

    const trend =
      recentHelpEvents > 1 || crewStats.flagged > 0 || desyncMetrics.fragmented
        ? "Rising"
        : desyncMetrics.drifting || desyncMetrics.staleMemberCount > 0
          ? "Unstable"
          : "Stable";

    const confidence = Math.round(
      Math.max(
        45,
        Math.min(
          98,
          55 +
            Math.min(displayRows.length, 5) * 5 +
            Math.min(crewCheckins.length, 5) * 3 +
            (desyncMetrics.missingLocationCount === 0 ? 8 : 0),
        ),
      ),
    );

    const recommendation =
      level === "Critical"
        ? "Contact the highest-risk member immediately, confirm their location, and begin crew intervention."
        : level === "High"
          ? "Request an immediate check-in and prepare the crew regroup plan."
          : level === "Elevated"
            ? "Monitor stale signals closely and request fresh location confirmation."
            : "No intervention is required. Continue passive monitoring.";

    const threatPulse =
      level === "Critical"
        ? "Rapid"
        : level === "High"
          ? "Elevated"
          : level === "Elevated"
            ? "Watch"
            : "Normal";

    return {
      threatScore,
      level,
      trend,
      confidence,
      recommendation,
      threatPulse,
      recentHelpEvents,
    };
  }, [
    crewCheckins,
    displayRows.length,
    highestRisk,
    crewStats.flagged,
    desyncMetrics,
  ]);

  const contextDecisionEngine = useMemo(() => {
    let score = 0;

    score += recommendationFeedback.successRate * 0.25;
    score += adaptiveDashboard.recommendationAccuracy * 0.2;
    score += confidenceFactors.score * 0.2;
    score += cohesionScore * 0.15;
    score += Math.max(0, 100 - threatAssessment.threatScore) * 0.2;

    score = Math.round(Math.max(0, Math.min(100, score)));

    const decisionLevel =
      score >= 90
        ? "Autonomous"
        : score >= 75
          ? "Assisted"
          : score >= 60
            ? "Guided"
            : "Learning";

    const recommendation =
      decisionLevel === "Autonomous"
        ? "TwinMe can confidently adapt recommendations automatically."
        : decisionLevel === "Assisted"
          ? "TwinMe should recommend actions with minimal user confirmation."
          : decisionLevel === "Guided"
            ? "TwinMe should ask for confirmation before adapting."
            : "Continue collecting behavioral context.";

    return {
      score,
      decisionLevel,
      recommendation,
    };
  }, [
    recommendationFeedback,
    adaptiveDashboard,
    confidenceFactors,
    cohesionScore,
    threatAssessment,
  ]);

  const personalizedRecommendation = useMemo(() => {
    const userName = privacy.displayName?.trim() || "Crew Member";

    const actionCounts = memoryTimeline.reduce(
      (counts, memory) => {
        const metadata =
          memory.metadata && typeof memory.metadata === "object"
            ? memory.metadata
            : null;

        const action =
          metadata &&
          "action" in metadata &&
          typeof metadata.action === "string"
            ? metadata.action
            : null;

        if (action) {
          counts[action] = (counts[action] || 0) + 1;
        }

        return counts;
      },
      {} as Record<string, number>,
    );

    const preferredActionEntry = Object.entries(actionCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const preferredAction = preferredActionEntry?.[0] || null;

    const preferredActionLabel =
      preferredAction === "check-in"
        ? "checking in"
        : preferredAction === "heading-home"
          ? "confirming that you are heading home"
          : preferredAction === "need-help"
            ? "requesting direct crew assistance"
            : "following the recommended crew action";

    const personalizationScore = Math.round(
      Math.max(
        35,
        Math.min(
          100,
          45 +
            Math.min(memoryTimeline.length, 10) * 4 +
            recommendationFeedback.successRate * 0.2 +
            contextDecisionEngine.score * 0.15,
        ),
      ),
    );

    const message =
      memoryTimeline.length === 0
        ? `${userName}, TwinMe is still learning your preferred crew actions. ${recommendationEngine.action}.`
        : `${userName}, based on your stored behavior and current crew context, you tend to respond best by ${preferredActionLabel}. TwinMe recommends: ${recommendationEngine.action}.`;

    const reasoning = [
      `${memoryTimeline.length} stored memor${
        memoryTimeline.length === 1 ? "y" : "ies"
      }`,
      `${recommendationFeedback.successRate}% recommendation success`,
      `${contextDecisionEngine.score} context score`,
      `${recommendationEngine.confidence}% current confidence`,
    ];

    return {
      userName,
      preferredAction,
      preferredActionLabel,
      personalizationScore,
      message,
      reasoning,
      action: recommendationEngine.action,
      priority: recommendationEngine.priority,
    };
  }, [
    privacy.displayName,
    memoryTimeline,
    recommendationFeedback.successRate,
    contextDecisionEngine.score,
    recommendationEngine,
  ]);

  const filteredRows = useMemo(() => {
    if (filter === "heading-home") {
      return crewMembersWithRisk.filter(
        (row) => (row.status || "").toLowerCase() === "heading home",
      );
    }

    if (filter === "active") {
      return crewMembersWithRisk.filter(
        (row) => (row.status || "").toLowerCase() !== "heading home",
      );
    }

    return crewMembersWithRisk;
  }, [crewMembersWithRisk, filter]);

  const crewPresenceInsight = useMemo(() => {
    // TWINCORE_CREW_PRESENCE_INTELLIGENCE_R13_1
    //
    // Tonight Context changes how TwinMe INTERPRETS crew presence.
    // It never fabricates presence, location, safety, or risk data.
    //
    // Safety truth continues to come from live Crew signals.
    const tonightLabel =
      crewTonightRead.destination ??
      crewTonightRead.occasion ??
      crewTonightRead.vibe ??
      null;

    if (filteredRows.length === 0) {
      return {
        loneMemberCount: 0,
        staleMemberCount: 0,
        headingHomeCount: 0,
        message: crewTonightRead.hasTonightContext
          ? tonightLabel
            ? `No live crew presence data yet for tonight at ${tonightLabel}.`
            : "No live crew presence data yet for tonight."
          : "No crew presence data available yet.",
        tonightAware: crewTonightRead.hasTonightContext,
        tonightLabel,
      };
    }

    const activeRows = filteredRows.filter((row) => {
      if (!row.updated_at) {
        return false;
      }

      const minutesAgo = Math.max(
        0,
        Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 60000),
      );

      return minutesAgo <= 30;
    });

    const staleMemberCount = filteredRows.filter((row) => {
      if (!row.updated_at) {
        return true;
      }

      const minutesAgo = Math.max(
        0,
        Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 60000),
      );

      return minutesAgo > 30;
    }).length;

    const headingHomeCount = filteredRows.filter((row) =>
      (row.status || "").toLowerCase().includes("heading home"),
    ).length;

    const locationCounts = new Map<string, number>();

    activeRows.forEach((row) => {
      const location = (row.location_name || "Unknown").trim().toLowerCase();

      locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);
    });

    const loneMemberCount = activeRows.filter((row) => {
      const location = (row.location_name || "Unknown").trim().toLowerCase();

      return (locationCounts.get(location) ?? 0) === 1;
    }).length;

    const baseMessage =
      loneMemberCount > 0
        ? `${loneMemberCount} crew member${
            loneMemberCount === 1 ? "" : "s"
          } may be separated from the group.`
        : staleMemberCount > 0
          ? `${staleMemberCount} crew signal${
              staleMemberCount === 1 ? " is" : "s are"
            } stale.`
          : headingHomeCount > 0
            ? `${headingHomeCount} crew member${
                headingHomeCount === 1 ? " is" : "s are"
              } heading home.`
            : "Your crew appears connected and active.";

    // TWINCORE_CREW_PRESENCE_CONTEXT_INTERPRETATION_R13_1
    //
    // Add Tonight context only when it is actually known.
    // The underlying live-presence conclusion remains unchanged.
    let message = baseMessage;

    if (crewTonightRead.hasTonightContext) {
      if (loneMemberCount > 0) {
        message = crewTonightRead.destination
          ? `${baseMessage} Tonight is centered around ${crewTonightRead.destination}.`
          : crewTonightRead.occasion
            ? `${baseMessage} Keep the ${crewTonightRead.occasion} crew coordinated.`
            : baseMessage;
      } else if (staleMemberCount > 0) {
        message = crewTonightRead.destination
          ? `${baseMessage} Confirm everyone is still aligned with ${crewTonightRead.destination}.`
          : baseMessage;
      } else if (headingHomeCount > 0) {
        message = crewTonightRead.occasion
          ? `${baseMessage} The ${crewTonightRead.occasion} crew is beginning to wind down.`
          : baseMessage;
      } else if (crewTonightRead.destination) {
        message = `Your crew appears connected and active for tonight at ${crewTonightRead.destination}.`;
      } else if (crewTonightRead.occasion) {
        message = `Your crew appears connected and active for tonight's ${crewTonightRead.occasion}.`;
      } else if (crewTonightRead.vibe) {
        message = `Your crew appears connected and active for tonight's ${crewTonightRead.vibe} vibe.`;
      }
    }

    return {
      loneMemberCount,
      staleMemberCount,
      headingHomeCount,
      message,
      tonightAware: crewTonightRead.hasTonightContext,
      tonightLabel,
    };
  }, [filteredRows, crewTonightRead]);

  const predictiveBehaviorModel = useMemo(() => {
    const predictionConfidence = Math.round(
      (predictiveCrewInsight.urgency === "Immediate"
        ? 35
        : predictiveCrewInsight.urgency === "Monitor"
          ? 25
          : 15) +
        recommendationFeedback.successRate * 0.2 +
        contextDecisionEngine.score * 0.3 +
        adaptiveDashboard.recommendationAccuracy * 0.25,
    );

    let nextBehavior = "Crew stability expected.";

    if (crewPresenceInsight.loneMemberCount > 0) {
      nextBehavior = "Crew regroup is likely within the next 15 minutes.";
    } else if (crewStats.headingHome > 0) {
      nextBehavior = "Additional members are likely to begin heading home.";
    } else if (highestRisk >= 75) {
      nextBehavior =
        "Direct crew intervention is becoming increasingly likely.";
    }

    const predictionWindow =
      predictionConfidence >= 85
        ? "Next 10 minutes"
        : predictionConfidence >= 70
          ? "Next 20 minutes"
          : "Next 30 minutes";

    return {
      predictionConfidence: Math.min(99, predictionConfidence),
      nextBehavior,
      predictionWindow,
      autonomousReady:
        predictionConfidence >= 90 &&
        contextDecisionEngine.decisionLevel === "Autonomous",
    };
  }, [
    predictiveCrewInsight,
    recommendationFeedback,
    contextDecisionEngine,
    adaptiveDashboard,
    crewPresenceInsight,
    crewStats,
    highestRisk,
  ]);

  const routineIntelligence = useMemo(() => {
    const totalCheckins = crewCheckins.length;

    const weekdayCount = crewCheckins.filter((c) => {
      const d = new Date(c.created_at).getDay();
      return d >= 1 && d <= 5;
    }).length;

    const weekendCount = totalCheckins - weekdayCount;

    const averageHour =
      totalCheckins === 0
        ? null
        : Math.round(
            crewCheckins.reduce(
              (sum, c) => sum + new Date(c.created_at).getHours(),
              0,
            ) / totalCheckins,
          );

    const dominantPattern =
      weekdayCount > weekendCount
        ? "Weekday Routine"
        : weekendCount > weekdayCount
          ? "Weekend Routine"
          : "Mixed Routine";

    const consistency = Math.min(
      99,
      Math.round((totalCheckins / Math.max(totalCheckins, 1)) * 100),
    );

    return {
      totalCheckins,
      weekdayCount,
      weekendCount,
      averageHour,
      dominantPattern,
      consistency,
    };
  }, [crewCheckins]);

  // TWINCORE_WHO_FITS_TONIGHT_R13_2
  //
  // TwinMe ranks tonight RELEVANCE — not friendship, personality,
  // safety, or permanent compatibility.
  //
  // Only known member-level Crew signals + ephemeral Tonight Context
  // are used. UNKNOWN remains UNKNOWN.
  const whoFitsTonight = useMemo(() => {
    const now = Date.now();

    const contextSignals = [
      crewTonightRead.destination,
      crewTonightRead.occasion,
      crewTonightRead.vibe,
      crewTonightRead.desiredFeeling,
    ].filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    const hasMeaningfulTonightContext =
      crewTonightRead.hasTonightContext && contextSignals.length > 0;

    const members = filteredRows
      .map((row, index) => {
        const status = (row.status || "").trim().toLowerCase();

        const hasFreshTimestamp = Boolean(row.updated_at);

        const minutesAgo = row.updated_at
          ? Math.max(
              0,
              Math.floor((now - new Date(row.updated_at).getTime()) / 60000),
            )
          : null;

        const isFresh = typeof minutesAgo === "number" && minutesAgo <= 30;

        const isVeryFresh = typeof minutesAgo === "number" && minutesAgo <= 10;

        const isHeadingHome = status.includes("heading home");

        const isActive =
          status.includes("active") ||
          status.includes("arrived") ||
          status.includes("safe") ||
          status.includes("moving");

        const hasKnownLocation = Boolean(
          row.location_name &&
          row.location_name.trim() &&
          row.location_name.trim().toLowerCase() !== "unknown" &&
          row.location_name.trim().toLowerCase() !== "hidden",
        );

        /**
         * Tonight relevance is intentionally conservative.
         *
         * This is NOT a safety score and NOT a personality score.
         * It represents how much current evidence TwinMe has that
         * this member is relevant to the active night.
         */
        let relevanceScore = 0;
        const reasons: string[] = [];

        if (isVeryFresh) {
          relevanceScore += 35;
          reasons.push("live crew signal");
        } else if (isFresh) {
          relevanceScore += 28;
          reasons.push("recent crew signal");
        } else if (hasFreshTimestamp) {
          relevanceScore += 8;
          reasons.push("older crew signal");
        }

        if (isActive) {
          relevanceScore += 25;
          reasons.push("active tonight");
        }

        if (hasKnownLocation) {
          relevanceScore += 15;
          reasons.push("known location");
        }

        if (hasMeaningfulTonightContext) {
          relevanceScore += 15;
          reasons.push("Tonight Context available");
        }

        if (crewTonightRead.partyCrewCount !== null) {
          relevanceScore += 5;
          reasons.push("party crew context");
        }

        if (crewTonightRead.connectedCrewCount !== null) {
          relevanceScore += 5;
          reasons.push("connected crew context");
        }

        if (isHeadingHome) {
          relevanceScore = Math.max(0, relevanceScore - 30);
          reasons.push("heading home");
        }

        const score = Math.max(0, Math.min(100, Math.round(relevanceScore)));

        const confidence = !hasMeaningfulTonightContext
          ? "Learning"
          : score >= 75
            ? "Strong Fit"
            : score >= 50
              ? "Possible Fit"
              : score >= 25
                ? "Low Signal"
                : "Not Enough Context";

        const name = row.name?.trim() || `Crew ${index + 1}`;

        const contextLine = crewTonightRead.destination
          ? `for ${crewTonightRead.destination}`
          : crewTonightRead.occasion
            ? `for tonight's ${crewTonightRead.occasion}`
            : crewTonightRead.vibe
              ? `for tonight's ${crewTonightRead.vibe} vibe`
              : "for tonight";

        let explanation: string;

        if (!hasMeaningfulTonightContext) {
          explanation =
            "TwinMe needs more Tonight Context before making a confident crew-fit recommendation.";
        } else if (isHeadingHome) {
          explanation = `${name} appears to be winding down, so TwinMe lowers their relevance ${contextLine}.`;
        } else if (score >= 75) {
          explanation = `${name} has strong current Crew signals ${contextLine}.`;
        } else if (score >= 50) {
          explanation = `${name} has enough current activity to remain a possible fit ${contextLine}.`;
        } else if (!isFresh) {
          explanation = `${name} needs a fresher Crew signal before TwinMe can confidently recommend them ${contextLine}.`;
        } else {
          explanation = `TwinMe has limited evidence connecting ${name} to the active plan ${contextLine}.`;
        }

        return {
          id: row.user_id || row.id || `crew-fit-${index}`,
          name,
          score,
          confidence,
          explanation,
          reasons,
          isFresh,
          isHeadingHome,
          location: hasKnownLocation ? row.location_name?.trim() || null : null,
        };
      })
      .sort((a, b) => {
        if (a.isHeadingHome !== b.isHeadingHome) {
          return a.isHeadingHome ? 1 : -1;
        }

        return b.score - a.score;
      });

    const recommendedMembers = members.filter(
      (member) => member.score >= 50 && !member.isHeadingHome,
    );

    const topFit =
      recommendedMembers[0] ??
      members.find((member) => !member.isHeadingHome) ??
      null;

    const summary =
      members.length === 0
        ? "No Crew members are available to evaluate yet."
        : !hasMeaningfulTonightContext
          ? "TwinMe can see Crew activity, but needs more Tonight Context before deciding who fits the plan."
          : recommendedMembers.length === 0
            ? "TwinMe does not have enough current evidence to confidently recommend a Crew member for tonight yet."
            : recommendedMembers.length === 1
              ? `${recommendedMembers[0].name} currently has the strongest signals for tonight.`
              : `${recommendedMembers.length} Crew members currently have enough live context to fit tonight.`;

    return {
      members,
      recommendedMembers,
      topFit,
      summary,
      contextSignalCount: contextSignals.length,
      hasMeaningfulTonightContext,
    };
  }, [filteredRows, crewTonightRead]);

  // TWINCORE_CREW_RECOMMENDATION_R13_3
  //
  // R13.3 converts R13.2 relevance intelligence into a social move.
  //
  // IMPORTANT:
  // - This does NOT create a second member scoring system.
  // - This does NOT infer friendship, personality, or safety.
  // - UNKNOWN context remains UNKNOWN.
  // - R13.2 remains the source of truth for tonight relevance.
  const crewRecommendation = useMemo(() => {
    const {
      members,
      recommendedMembers,
      topFit,
      hasMeaningfulTonightContext,
      contextSignalCount,
    } = whoFitsTonight;

    if (members.length === 0) {
      return {
        lane: "LEARN MORE",
        headline: "Bring your Crew online first.",
        body: "TwinMe needs live Crew activity before it can recommend who belongs in tonight's move.",
        actionLabel: "Invite Crew",
        actionTarget: "crew-members",
        confidence: "WAITING",
        names: [] as string[],
      };
    }

    if (!hasMeaningfulTonightContext) {
      return {
        lane: "LEARN MORE",
        headline: "Give TwinMe the move first.",
        body: "Your Crew is visible, but tonight's destination, occasion, vibe or desired feeling is still too thin for a confident recommendation.",
        actionLabel: "Add Tonight Context",
        actionTarget: "who-fits-tonight",
        confidence: "LEARNING",
        names: topFit ? [topFit.name] : ([] as string[]),
      };
    }

    const strongFits = recommendedMembers.filter(
      (member) => member.score >= 75,
    );

    const possibleFits = recommendedMembers.filter(
      (member) => member.score >= 50 && member.score < 75,
    );

    if (strongFits.length >= 2) {
      const names = strongFits.slice(0, 3).map((member) => member.name);

      return {
        lane: "RALLY",
        headline: "Bring this Crew together.",
        body: `${names.join(
          ", ",
        )} currently carry the strongest live signals for tonight. TwinMe has enough context to recommend rallying this group.`,
        actionLabel: "Rally Crew",
        actionTarget: "crew-members",
        confidence: "STRONG",
        names,
      };
    }

    if (strongFits.length === 1) {
      const member = strongFits[0];

      return {
        lane: "PING ONE",
        headline: `Start with ${member.name}.`,
        body: `${member.name} currently has the strongest combination of live Crew activity and tonight relevance. Start there before widening the move.`,
        actionLabel: `Find ${member.name}`,
        actionTarget: "crew-members",
        confidence: "STRONG",
        names: [member.name],
      };
    }

    if (possibleFits.length >= 2) {
      const names = possibleFits.slice(0, 3).map((member) => member.name);

      return {
        lane: "KEEP IT SMALL",
        headline: "Keep the first move tight.",
        body: `${names.join(
          " and ",
        )} remain relevant, but TwinMe does not have a strong enough signal to rally the whole Crew yet.`,
        actionLabel: "Review Crew",
        actionTarget: "crew-members",
        confidence: "DEVELOPING",
        names,
      };
    }

    if (possibleFits.length === 1) {
      const member = possibleFits[0];

      return {
        lane: "PING ONE",
        headline: `Check ${member.name} first.`,
        body: `${member.name} is the clearest current possibility, but TwinMe is keeping the recommendation narrow until stronger signals arrive.`,
        actionLabel: `Find ${member.name}`,
        actionTarget: "crew-members",
        confidence: "DEVELOPING",
        names: [member.name],
      };
    }

    const headingHome = members.filter((member) => member.isHeadingHome);

    if (headingHome.length > 0) {
      const member = headingHome[0];

      return {
        lane: "CHECK IN",
        headline: "The Crew may be winding down.",
        body: `${member.name} appears to be heading home. TwinMe will not treat that signal as an invitation to pull them back into the night.`,
        actionLabel: "Review Crew",
        actionTarget: "crew-members",
        confidence: "CAUTIOUS",
        names: [member.name],
      };
    }

    return {
      lane: "LEARN MORE",
      headline: "Don't force the Crew move yet.",
      body: `TwinMe has ${contextSignalCount} Tonight Context signal${
        contextSignalCount === 1 ? "" : "s"
      }, but current Crew evidence is still too weak for a confident recommendation.`,
      actionLabel: "Review Crew",
      actionTarget: "crew-members",
      confidence: "LEARNING",
      names: [] as string[],
    };
  }, [whoFitsTonight]);

  // TWINCORE_CREW_ACTION_INTELLIGENCE_R13_4
  //
  // Converts the existing R13.3 recommendation into navigation/action
  // against the REAL Crew surface.
  //
  // IMPORTANT:
  // - R13.2 remains the relevance source of truth.
  // - R13.3 remains the recommendation source of truth.
  // - R13.4 does not create another scoring model.
  // - Safety-sensitive HELP signals are never treated as party-fit signals.
  const executeCrewRecommendation = useCallback(() => {
    const scrollTo = (targetId: string) => {
      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    const targetNames = crewRecommendation.names
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    // TWINCORE_CREW_ACTION_HELP_GUARD_R13_4
    //
    // Help remains safety-sensitive. If a recommended member is currently
    // signaling help, surface that member rather than treating the signal
    // as nightlife participation.
    const helpTarget = displayRows.find((row, index) => {
      const isSelf = row.id === currentUserId;
      const name = isSelf
        ? row.name || privacy.displayName || "Crew Member"
        : row.name || `Crew ${index + 1}`;
      const status = (row.status || "").trim().toLowerCase();

      return (
        targetNames.includes(name.trim().toLowerCase()) &&
        status.includes("help")
      );
    });

    if (helpTarget) {
      const helpIndex = displayRows.indexOf(helpTarget);
      const helpName =
        helpTarget.id === currentUserId
          ? helpTarget.name || privacy.displayName || "Crew Member"
          : helpTarget.name || `Crew ${helpIndex + 1}`;

      const helpMemberId = helpTarget.id || `${helpName}-${helpIndex}`;

      setExpandedMemberId(helpMemberId);
      scrollTo("crew-members");
      return;
    }

    // TWINCORE_CREW_ACTION_MEMBER_TARGET_R13_4
    //
    // PING ONE / CHECK IN can now open the actual recommended member.
    if (targetNames.length === 1) {
      const targetIndex = displayRows.findIndex((row, index) => {
        const isSelf = row.id === currentUserId;
        const name = isSelf
        ? row.name || privacy.displayName || "Crew Member"
        : row.name || `Crew ${index + 1}`;

        return targetNames.includes(name.trim().toLowerCase());
      });

      if (targetIndex >= 0) {
        const row = displayRows[targetIndex];
        const name =
          row.id === currentUserId
            ? row.name || privacy.displayName || "Crew Member"
            : row.name || `Crew ${targetIndex + 1}`;

        const memberId = row.id || `${name}-${targetIndex}`;

        setExpandedMemberId(memberId);
        scrollTo("crew-members");
        return;
      }
    }

    // TWINCORE_CREW_ACTION_RALLY_R13_4
    //
    // Multi-member recommendations deliberately surface the Crew list.
    // We do not fabricate messaging, invitations or check-ins.
    if (targetNames.length > 1) {
      setExpandedMemberId(null);
      scrollTo("crew-members");
      return;
    }

    // TWINCORE_CREW_TONIGHT_CONTEXT_BRIDGE_R13_4_3
    //
    // Crew can READ Tonight Context, but the user must leave Crew
    // to provide the missing night plan. Do not scroll back into
    // Who Fits Tonight and create a no-op interaction.
    if (
      crewRecommendation.actionLabel === "Add Tonight Context" ||
      crewRecommendation.actionTarget === "who-fits-tonight"
    ) {
      window.location.assign("/party");
      return;
    }

    // TWINCORE_CREW_ACTION_FALLBACK_R13_4
    //
    // Existing local R13.3 targets remain valid for Invite Crew
    // and general Crew review.
    scrollTo(crewRecommendation.actionTarget);
  }, [crewRecommendation, currentUserId, displayRows]);

  // TWINCORE_CREW_PAYOFF_INTELLIGENCE_R13_5
  //
  // R13.5 converts the existing Crew recommendation into a concise
  // completion state for tonight.
  //
  // SOURCE OF TRUTH:
  // - R13.2 decides current Crew relevance.
  // - R13.3 decides the recommended social move.
  // - R13.4 executes that move.
  // - R13.5 only communicates what the user should understand next.
  //
  // IMPORTANT:
  // - No second scoring model.
  // - No fabricated friendship or personality inference.
  // - No fabricated messaging or invitations.
  // - UNKNOWN Tonight Context remains UNKNOWN.
  // - HELP remains safety-sensitive and is never converted into nightlife payoff.
  const crewPayoff = useMemo(() => {
    const { members, recommendedMembers, hasMeaningfulTonightContext } =
      whoFitsTonight;

    const normalizedNames = crewRecommendation.names
      .map((name) => name.trim())
      .filter(Boolean);

    const helpNames = displayRows
      .map((row, index) => {
        const isSelf = row.id === currentUserId;
        const name = isSelf
        ? row.name || privacy.displayName || "Crew Member"
        : row.name || `Crew ${index + 1}`;
        const status = (row.status || "").trim().toLowerCase();

        return status.includes("help") ? name : null;
      })
      .filter((name): name is string => Boolean(name));

    // TWINCORE_CREW_PAYOFF_HELP_GUARD_R13_5
    if (helpNames.length > 0) {
      return {
        state: "CHECK-IN NEEDED",
        eyebrow: "Crew needs attention",
        headline:
          helpNames.length === 1
            ? `Check on ${helpNames[0]}.`
            : "Check your Crew before the next move.",
        body:
          helpNames.length === 1
            ? `${helpNames[0]} has a current help-sensitive signal. TwinMe is keeping attention on the Crew instead of turning that signal into a nightlife recommendation.`
            : `${helpNames.length} Crew members currently have help-sensitive signals. TwinMe is keeping attention on the Crew before continuing the night.`,
        actionLabel: "Check Crew",
        actionType: "crew" as const,
        tone: "attention" as const,
        names: helpNames,
      };
    }

    if (members.length === 0) {
      return {
        state: "CREW FORMING",
        eyebrow: "TwinMe is waiting",
        headline: "Bring your Crew online.",
        body: "TwinMe needs real Crew activity before it can close the loop on tonight.",
        actionLabel: "Review Crew",
        actionType: "crew" as const,
        tone: "learning" as const,
        names: [] as string[],
      };
    }

    if (!hasMeaningfulTonightContext) {
      return {
        state: "STILL LEARNING",
        eyebrow: "Tonight needs context",
        headline: "Give TwinMe tonight's move.",
        body: "Your Crew is visible. Add the destination, occasion, vibe or desired feeling so TwinMe can decide whether this Crew fits the night.",
        actionLabel: "Add Tonight Context",
        actionType: "party" as const,
        tone: "learning" as const,
        names: normalizedNames,
      };
    }

    if (crewRecommendation.lane === "RALLY" && recommendedMembers.length >= 2) {
      return {
        state: "CREW READY",
        eyebrow: "The move has a Crew",
        headline: "Your crew fits the move.",
        body:
          normalizedNames.length > 0
            ? `${normalizedNames.join(", ")} currently carry the strongest live signals for tonight. TwinMe has enough context to move forward.`
            : "TwinMe has enough current Crew and Tonight Context to move forward.",
        actionLabel: "Find The Move",
        actionType: "spots" as const,
        tone: "ready" as const,
        names: normalizedNames,
      };
    }

    if (crewRecommendation.lane === "PING ONE") {
      const name = normalizedNames[0];

      return {
        state: "KEEP IT SMALL",
        eyebrow: "Start narrow",
        headline: name ? `Start with ${name}.` : "Keep tonight tight.",
        body: name
          ? `${name} currently has the clearest fit for tonight. TwinMe does not need to widen the Crew before you make the next move.`
          : "TwinMe sees a narrow Crew move tonight. Keep it focused while stronger signals develop.",
        actionLabel: "Review Crew",
        actionType: "crew" as const,
        tone: "developing" as const,
        names: normalizedNames,
      };
    }

    if (crewRecommendation.lane === "KEEP IT SMALL") {
      return {
        state: "KEEP IT SMALL",
        eyebrow: "The smaller move fits",
        headline: "Don't overbuild the Crew.",
        body:
          normalizedNames.length > 0
            ? `${normalizedNames.join(" and ")} remain relevant tonight, but TwinMe is keeping the move intentionally small while the signal develops.`
            : "TwinMe sees enough context to keep the move small, but not enough to rally the wider Crew.",
        actionLabel: "Review Crew",
        actionType: "crew" as const,
        tone: "developing" as const,
        names: normalizedNames,
      };
    }

    if (crewRecommendation.lane === "CHECK IN") {
      return {
        state: "CREW WINDING DOWN",
        eyebrow: "Respect the signal",
        headline: "Let the night breathe.",
        body: "Someone appears to be heading home. TwinMe will not treat that as an invitation to pull them back into the night.",
        actionLabel: "Review Crew",
        actionType: "crew" as const,
        tone: "developing" as const,
        names: normalizedNames,
      };
    }

    return {
      state: "CREW FORMING",
      eyebrow: "Signal still developing",
      headline: "One more signal would tighten the Crew.",
      body: crewRecommendation.body,
      actionLabel: "Review Crew",
      actionType: "crew" as const,
      tone: "learning" as const,
      names: normalizedNames,
    };
  }, [crewRecommendation, currentUserId, displayRows, whoFitsTonight]);

  // TWINCORE_CREW_PAYOFF_ACTION_R13_5
  const executeCrewPayoff = useCallback(() => {
    if (crewPayoff.actionType === "party") {
      window.location.assign("/party");
      return;
    }

    if (crewPayoff.actionType === "spots") {
      window.location.assign("/spots");
      return;
    }

    const targetNames = crewPayoff.names
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    if (targetNames.length === 1) {
      const targetIndex = displayRows.findIndex((row, index) => {
        const isSelf = row.id === currentUserId;
        const name = isSelf
        ? row.name || privacy.displayName || "Crew Member"
        : row.name || `Crew ${index + 1}`;

        return targetNames.includes(name.trim().toLowerCase());
      });

      if (targetIndex >= 0) {
        const row = displayRows[targetIndex];
        const name =
          row.id === currentUserId
            ? row.name || privacy.displayName || "Crew Member"
            : row.name || `Crew ${targetIndex + 1}`;

        setExpandedMemberId(row.id || `${name}-${targetIndex}`);
      }
    } else {
      setExpandedMemberId(null);
    }

    window.requestAnimationFrame(() => {
      document.getElementById("crew-members")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [crewPayoff, currentUserId, displayRows]);

  const relationshipIntelligence = useMemo(() => {
    const activeMembers = displayRows.length;

    const helpLeaders = crewCheckins.filter((c) =>
      (c.status || "").toLowerCase().includes("help"),
    ).length;

    const checkIns = crewCheckins.filter((c) =>
      (c.status || "").toLowerCase().includes("active"),
    ).length;

    const trustScore = Math.min(
      99,
      Math.round(
        recommendationFeedback.successRate * 0.35 +
          adaptiveDashboard.recommendationAccuracy * 0.25 +
          routineIntelligence.consistency * 0.2 +
          cohesionScore * 0.2,
      ),
    );

    const relationshipStrength =
      trustScore >= 90
        ? "Exceptional"
        : trustScore >= 75
          ? "Strong"
          : trustScore >= 60
            ? "Growing"
            : "Developing";

    const insight =
      relationshipStrength === "Exceptional"
        ? "TwinMe detects a highly coordinated crew with consistent interaction patterns."
        : relationshipStrength === "Strong"
          ? "Crew interaction is stable and improving through repeated collaboration."
          : relationshipStrength === "Growing"
            ? "TwinMe is learning recurring interaction patterns between crew members."
            : "More shared activity will improve relationship intelligence.";

    return {
      activeMembers,
      helpLeaders,
      checkIns,
      trustScore,
      relationshipStrength,
      insight,
    };
  }, [
    displayRows,
    crewCheckins,
    recommendationFeedback,
    adaptiveDashboard,
    routineIntelligence,
    cohesionScore,
  ]);

  const emotionalContext = useMemo(() => {
    const concernSignals =
      threatAssessment.recentHelpEvents +
      crewPresenceInsight.staleMemberCount +
      crewPresenceInsight.loneMemberCount;

    const reassuranceSignals =
      recommendationFeedback.accepted + Math.max(0, crewStats.headingHome);

    const emotionalScore = Math.max(
      0,
      Math.min(100, 100 - concernSignals * 12 + reassuranceSignals * 3),
    );

    const state =
      emotionalScore >= 85
        ? "Calm"
        : emotionalScore >= 65
          ? "Attentive"
          : emotionalScore >= 45
            ? "Concerned"
            : "Critical";

    const guidance =
      state === "Calm"
        ? "Crew signals are healthy. Continue normal monitoring."
        : state === "Attentive"
          ? "Remain aware of developing crew activity."
          : state === "Concerned"
            ? "Recommend proactive check-ins and regroup planning."
            : "Immediate crew intervention is recommended.";

    return {
      emotionalScore,
      state,
      guidance,
      concernSignals,
      reassuranceSignals,
    };
  }, [
    threatAssessment,
    crewPresenceInsight,
    recommendationFeedback,
    crewStats,
  ]);

  const autonomousTwinMe = useMemo(() => {
    const weightedScore = Math.round(
      recommendationFeedback.successRate * 0.15 +
        adaptiveDashboard.recommendationAccuracy * 0.15 +
        contextDecisionEngine.score * 0.2 +
        predictiveBehaviorModel.predictionConfidence * 0.15 +
        routineIntelligence.consistency * 0.1 +
        relationshipIntelligence.trustScore * 0.1 +
        emotionalContext.emotionalScore * 0.15,
    );

    const readiness =
      weightedScore >= 90
        ? "Ready"
        : weightedScore >= 75
          ? "Assisted"
          : weightedScore >= 60
            ? "Learning"
            : "Developing";

    const recommendation =
      readiness === "Ready"
        ? "TwinMe has strong confidence in its combined recommendations."
        : readiness === "Assisted"
          ? "TwinMe recommends actions with user confirmation."
          : readiness === "Learning"
            ? "TwinMe is still refining its understanding from accumulated experience."
            : "Continue gathering experience before increasing autonomy.";

    return {
      weightedScore,
      readiness,
      recommendation,
    };
  }, [
    recommendationFeedback,
    adaptiveDashboard,
    contextDecisionEngine,
    predictiveBehaviorModel,
    routineIntelligence,
    relationshipIntelligence,
    emotionalContext,
  ]);

  const multiAgentCoordinator = useMemo(() => {
    const agents = [
      { name: "Memory", score: adaptiveLearning.learningScore },
      {
        name: "Prediction",
        score: predictiveBehaviorModel.predictionConfidence,
      },
      { name: "Routine", score: routineIntelligence.consistency },
      { name: "Relationship", score: relationshipIntelligence.trustScore },
      { name: "Emotion", score: emotionalContext.emotionalScore },
      { name: "Autonomous", score: autonomousTwinMe.weightedScore },
    ];

    const overallScore = Math.round(
      agents.reduce((sum, agent) => sum + agent.score, 0) / agents.length,
    );

    const activeAgents = agents.filter((a) => a.score >= 60).length;

    const status =
      overallScore >= 90
        ? "Synchronized"
        : overallScore >= 75
          ? "Coordinated"
          : overallScore >= 60
            ? "Learning"
            : "Initializing";

    return {
      agents,
      overallScore,
      activeAgents,
      status,
    };
  }, [
    adaptiveLearning,
    predictiveBehaviorModel,
    routineIntelligence,
    relationshipIntelligence,
    emotionalContext,
    autonomousTwinMe,
  ]);

  const cloudIntelligence = useMemo(() => {
    const modules = ["TwinMe", "Crew", "Party", "Spots", "Safety Hub"];

    const synchronizedModules = modules.length;

    const sharedKnowledgeScore = Math.round(
      autonomousTwinMe.weightedScore * 0.3 +
        multiAgentCoordinator.overallScore * 0.3 +
        adaptiveDashboard.recommendationAccuracy * 0.2 +
        contextDecisionEngine.score * 0.2,
    );

    const syncStatus =
      sharedKnowledgeScore >= 90
        ? "Fully Synchronized"
        : sharedKnowledgeScore >= 75
          ? "Connected"
          : sharedKnowledgeScore >= 60
            ? "Learning"
            : "Initializing";

    const cloudInsight =
      syncStatus === "Fully Synchronized"
        ? "TwinCore modules are sharing intelligence effectively."
        : syncStatus === "Connected"
          ? "Cloud intelligence is actively synchronizing recommendations."
          : syncStatus === "Learning"
            ? "Shared knowledge is expanding as TwinCore learns."
            : "TwinCore Cloud is initializing.";

    return {
      synchronizedModules,
      sharedKnowledgeScore,
      syncStatus,
      cloudInsight,
    };
  }, [
    autonomousTwinMe,
    multiAgentCoordinator,
    adaptiveDashboard,
    contextDecisionEngine,
  ]);

  const crossModuleReasoning = useMemo(() => {
    const moduleSignals = [
      {
        name: "Crew",
        score: cohesionScore,
        insight: twinMeRecommendation,
      },
      {
        name: "Safety",
        score: Math.max(0, 100 - threatAssessment.threatScore),
        insight: threatAssessment.recommendation,
      },
      {
        name: "Prediction",
        score: predictiveBehaviorModel.predictionConfidence,
        insight: predictiveBehaviorModel.nextBehavior,
      },
      {
        name: "Personalization",
        score: personalizedRecommendation.personalizationScore,
        insight: personalizedRecommendation.message,
      },
      {
        name: "Cloud",
        score: cloudIntelligence.sharedKnowledgeScore,
        insight: cloudIntelligence.cloudInsight,
      },
    ];

    const strongestModule = [...moduleSignals].sort(
      (a, b) => b.score - a.score,
    )[0];

    const weakestModule = [...moduleSignals].sort(
      (a, b) => a.score - b.score,
    )[0];

    const reasoningScore = Math.round(
      moduleSignals.reduce((sum, module) => sum + module.score, 0) /
        moduleSignals.length,
    );

    const reasoningState =
      reasoningScore >= 90
        ? "Unified"
        : reasoningScore >= 75
          ? "Connected"
          : reasoningScore >= 60
            ? "Developing"
            : "Fragmented";

    const unifiedRecommendation =
      threatAssessment.level === "Critical" || threatAssessment.level === "High"
        ? threatAssessment.recommendation
        : contextDecisionEngine.decisionLevel === "Autonomous"
          ? `${personalizedRecommendation.action}. ${predictiveBehaviorModel.nextBehavior}`
          : `${contextDecisionEngine.recommendation} ${personalizedRecommendation.message}`;

    return {
      moduleSignals,
      strongestModule,
      weakestModule,
      reasoningScore,
      reasoningState,
      unifiedRecommendation,
    };
  }, [
    cohesionScore,
    twinMeRecommendation,
    threatAssessment,
    predictiveBehaviorModel,
    personalizedRecommendation,
    cloudIntelligence,
    contextDecisionEngine,
  ]);

  const longTermMemory = useMemo(() => {
    const memories = [
      {
        category: "Preferences",
        score: personalizedRecommendation.personalizationScore,
      },
      {
        category: "Relationships",
        score: relationshipIntelligence.trustScore,
      },
      {
        category: "Routine",
        score: routineIntelligence.consistency,
      },
      {
        category: "Learning",
        score: adaptiveLearning.learningScore,
      },
      {
        category: "Prediction",
        score: predictiveBehaviorModel.predictionConfidence,
      },
    ];

    const memoryStrength = Math.round(
      memories.reduce((sum, memory) => sum + memory.score, 0) / memories.length,
    );

    const retainedMemories = memories.filter((m) => m.score >= 70).length;

    const memoryState =
      memoryStrength >= 90
        ? "Established"
        : memoryStrength >= 75
          ? "Growing"
          : memoryStrength >= 60
            ? "Learning"
            : "Building";

    const insight =
      memoryState === "Established"
        ? "TwinMe has built strong long-term knowledge."
        : memoryState === "Growing"
          ? "Long-term memory is becoming more reliable."
          : memoryState === "Learning"
            ? "TwinMe is identifying lasting patterns."
            : "Collecting experiences for future memory.";

    return {
      memories,
      memoryStrength,
      retainedMemories,
      memoryState,
      insight,
    };
  }, [
    personalizedRecommendation,
    relationshipIntelligence,
    routineIntelligence,
    adaptiveLearning,
    predictiveBehaviorModel,
  ]);

  const proactiveTwinMe = useMemo(() => {
    const opportunities = [];

    if (routineIntelligence.consistency >= 80) {
      opportunities.push({
        type: "Routine",
        priority: "Medium",
        suggestion: "Suggest reminders around the user's established routine.",
      });
    }

    if (relationshipIntelligence.trustScore >= 80) {
      opportunities.push({
        type: "Relationship",
        priority: "Medium",
        suggestion:
          "Recommend checking in with frequently connected crew members.",
      });
    }

    if (
      threatAssessment.level === "High" ||
      threatAssessment.level === "Critical"
    ) {
      opportunities.push({
        type: "Safety",
        priority: "High",
        suggestion: threatAssessment.recommendation,
      });
    }

    if (predictiveBehaviorModel.predictionConfidence >= 85) {
      opportunities.push({
        type: "Prediction",
        priority: "Low",
        suggestion: predictiveBehaviorModel.nextBehavior,
      });
    }

    const readiness = Math.round(
      autonomousTwinMe.weightedScore * 0.35 +
        longTermMemory.memoryStrength * 0.35 +
        crossModuleReasoning.reasoningScore * 0.3,
    );

    const mode =
      readiness >= 90
        ? "Highly Proactive"
        : readiness >= 75
          ? "Proactive"
          : readiness >= 60
            ? "Assistive"
            : "Learning";

    const topSuggestion =
      opportunities.length > 0
        ? opportunities[0].suggestion
        : "Continue learning from user behavior.";

    return {
      opportunities,
      readiness,
      mode,
      topSuggestion,
    };
  }, [
    routineIntelligence,
    relationshipIntelligence,
    threatAssessment,
    predictiveBehaviorModel,
    autonomousTwinMe,
    longTermMemory,
    crossModuleReasoning,
  ]);

  const ecosystemOrchestrator = useMemo(() => {
    const ecosystemModules = [
      {
        name: "TwinMe",
        score: autonomousTwinMe.weightedScore,
        status: autonomousTwinMe.readiness,
      },
      {
        name: "Crew",
        score: cohesionScore,
        status: desyncMetrics.fragmented
          ? "Fragmented"
          : desyncMetrics.drifting
            ? "Drifting"
            : "Synchronized",
      },
      {
        name: "Cloud",
        score: cloudIntelligence.sharedKnowledgeScore,
        status: cloudIntelligence.syncStatus,
      },
      {
        name: "Reasoning",
        score: crossModuleReasoning.reasoningScore,
        status: crossModuleReasoning.reasoningState,
      },
      {
        name: "Proactive",
        score: proactiveTwinMe.readiness,
        status: proactiveTwinMe.mode,
      },
      {
        name: "Agents",
        score: multiAgentCoordinator.overallScore,
        status: multiAgentCoordinator.status,
      },
    ];

    const ecosystemScore = Math.round(
      ecosystemModules.reduce((sum, module) => sum + module.score, 0) /
        ecosystemModules.length,
    );

    const healthyModules = ecosystemModules.filter(
      (module) => module.score >= 70,
    ).length;

    const attentionModules = ecosystemModules.filter(
      (module) => module.score < 60,
    );

    const strongestModule = [...ecosystemModules].sort(
      (a, b) => b.score - a.score,
    )[0];

    const focusModule = [...ecosystemModules].sort(
      (a, b) => a.score - b.score,
    )[0];

    const ecosystemState =
      ecosystemScore >= 90
        ? "Unified"
        : ecosystemScore >= 75
          ? "Connected"
          : ecosystemScore >= 60
            ? "Coordinating"
            : "Building";

    const nextAction =
      threatAssessment.level === "Critical" || threatAssessment.level === "High"
        ? threatAssessment.recommendation
        : attentionModules.length > 0
          ? `Strengthen the ${focusModule.name} module while maintaining ecosystem synchronization.`
          : proactiveTwinMe.topSuggestion;

    const orchestrationInsight =
      ecosystemState === "Unified"
        ? "TwinCore modules are operating as one coordinated intelligence ecosystem."
        : ecosystemState === "Connected"
          ? "TwinCore modules are sharing context and coordinating recommendations."
          : ecosystemState === "Coordinating"
            ? "The ecosystem is actively aligning module intelligence."
            : "TwinCore is building the shared context required for full orchestration.";

    return {
      ecosystemModules,
      ecosystemScore,
      healthyModules,
      attentionModules,
      strongestModule,
      focusModule,
      ecosystemState,
      nextAction,
      orchestrationInsight,
    };
  }, [
    autonomousTwinMe,
    cohesionScore,
    desyncMetrics,
    cloudIntelligence,
    crossModuleReasoning,
    proactiveTwinMe,
    multiAgentCoordinator,
    threatAssessment,
  ]);

  const intelligentContextFusion = useMemo(() => {
    const contexts = [
      {
        name: "Safety",
        score: Math.max(0, 100 - threatAssessment.threatScore),
        urgency:
          threatAssessment.level === "Critical"
            ? 100
            : threatAssessment.level === "High"
              ? 85
              : threatAssessment.level === "Elevated"
                ? 65
                : 30,
        insight: threatAssessment.recommendation,
      },
      {
        name: "Crew",
        score: cohesionScore,
        urgency: desyncMetrics.fragmented
          ? 90
          : desyncMetrics.drifting
            ? 65
            : 25,
        insight: twinMeRecommendation,
      },
      {
        name: "Prediction",
        score: predictiveBehaviorModel.predictionConfidence,
        urgency:
          predictiveCrewInsight.urgency === "Immediate"
            ? 90
            : predictiveCrewInsight.urgency === "Monitor"
              ? 60
              : 25,
        insight: predictiveBehaviorModel.nextBehavior,
      },
      {
        name: "Routine",
        score: routineIntelligence.consistency,
        urgency: routineIntelligence.consistency >= 80 ? 45 : 20,
        insight: `Current routine pattern: ${routineIntelligence.dominantPattern}.`,
      },
      {
        name: "Relationship",
        score: relationshipIntelligence.trustScore,
        urgency: relationshipIntelligence.trustScore < 60 ? 55 : 25,
        insight: relationshipIntelligence.insight,
      },
      {
        name: "Emotion",
        score: emotionalContext.emotionalScore,
        urgency:
          emotionalContext.state === "Critical"
            ? 95
            : emotionalContext.state === "Concerned"
              ? 70
              : emotionalContext.state === "Attentive"
                ? 45
                : 20,
        insight: emotionalContext.guidance,
      },
      {
        name: "Memory",
        score: longTermMemory.memoryStrength,
        urgency: longTermMemory.memoryStrength < 60 ? 40 : 20,
        insight: longTermMemory.insight,
      },
      {
        name: "Cloud",
        score: cloudIntelligence.sharedKnowledgeScore,
        urgency: cloudIntelligence.sharedKnowledgeScore < 60 ? 45 : 20,
        insight: cloudIntelligence.cloudInsight,
      },
    ];

    const rankedContexts = [...contexts].sort(
      (a, b) => b.urgency - a.urgency || b.score - a.score,
    );

    const primaryContext = rankedContexts[0];
    const secondaryContext = rankedContexts[1];

    const fusionScore = Math.round(
      contexts.reduce((sum, context) => sum + context.score, 0) /
        contexts.length,
    );

    const fusionState =
      fusionScore >= 90
        ? "Unified"
        : fusionScore >= 75
          ? "Aligned"
          : fusionScore >= 60
            ? "Blending"
            : "Fragmented";

    const priority =
      primaryContext.urgency >= 90
        ? "Immediate"
        : primaryContext.urgency >= 65
          ? "High"
          : primaryContext.urgency >= 40
            ? "Medium"
            : "Low";

    const fusedRecommendation =
      priority === "Immediate" || priority === "High"
        ? primaryContext.insight
        : `${primaryContext.insight} ${secondaryContext.insight}`;

    return {
      contexts,
      rankedContexts,
      primaryContext,
      secondaryContext,
      fusionScore,
      fusionState,
      priority,
      fusedRecommendation,
    };
  }, [
    threatAssessment,
    cohesionScore,
    desyncMetrics,
    twinMeRecommendation,
    predictiveBehaviorModel,
    predictiveCrewInsight,
    routineIntelligence,
    relationshipIntelligence,
    emotionalContext,
    longTermMemory,
    cloudIntelligence,
  ]);

  const adaptiveDecisionMatrix = useMemo(() => {
    const candidates = [
      {
        action: recommendationEngine.action,
        source: "Recommendation",
        confidence: recommendationEngine.confidence,
        urgency:
          recommendationEngine.priority === "Critical"
            ? 100
            : recommendationEngine.priority === "High"
              ? 85
              : recommendationEngine.priority === "Medium"
                ? 60
                : 30,
      },
      {
        action: intelligentContextFusion.fusedRecommendation,
        source: "Context Fusion",
        confidence: intelligentContextFusion.fusionScore,
        urgency:
          intelligentContextFusion.priority === "Immediate"
            ? 100
            : intelligentContextFusion.priority === "High"
              ? 85
              : intelligentContextFusion.priority === "Medium"
                ? 60
                : 30,
      },
      {
        action: ecosystemOrchestrator.nextAction,
        source: "Ecosystem",
        confidence: ecosystemOrchestrator.ecosystemScore,
        urgency: ecosystemOrchestrator.attentionModules.length > 0 ? 65 : 35,
      },
      {
        action: proactiveTwinMe.topSuggestion,
        source: "Proactive",
        confidence: proactiveTwinMe.readiness,
        urgency:
          proactiveTwinMe.mode === "Highly Proactive"
            ? 70
            : proactiveTwinMe.mode === "Proactive"
              ? 55
              : 35,
      },
    ];

    const rankedCandidates = [...candidates].sort(
      (a, b) => b.urgency - a.urgency || b.confidence - a.confidence,
    );

    const selectedDecision = rankedCandidates[0];
    const fallbackDecision = rankedCandidates[1];

    const decisionScore = Math.round(
      selectedDecision.confidence * 0.65 + selectedDecision.urgency * 0.35,
    );

    const requiresConfirmation =
      decisionScore < 90 ||
      contextDecisionEngine.decisionLevel !== "Autonomous";

    const decisionState =
      decisionScore >= 90
        ? "High Confidence"
        : decisionScore >= 75
          ? "Assisted"
          : decisionScore >= 60
            ? "Guided"
            : "Learning";

    const executionMode = requiresConfirmation
      ? "User Confirmation"
      : "Autonomous Ready";

    return {
      candidates,
      rankedCandidates,
      selectedDecision,
      fallbackDecision,
      decisionScore,
      requiresConfirmation,
      decisionState,
      executionMode,
    };
  }, [
    recommendationEngine,
    intelligentContextFusion,
    ecosystemOrchestrator,
    proactiveTwinMe,
    contextDecisionEngine,
  ]);

  const predictiveActionPlanner = useMemo(() => {
    const primaryDecision = adaptiveDecisionMatrix.selectedDecision;

    const fallbackDecision = adaptiveDecisionMatrix.fallbackDecision;

    const actionSteps = [
      {
        id: "observe",
        label: "Observe current signals",
        status: "Ready",
        confidence: intelligentContextFusion.fusionScore,
      },
      {
        id: "confirm",
        label: adaptiveDecisionMatrix.requiresConfirmation
          ? "Request user confirmation"
          : "Confirmation not required",
        status: adaptiveDecisionMatrix.requiresConfirmation
          ? "Pending"
          : "Ready",
        confidence: adaptiveDecisionMatrix.decisionScore,
      },
      {
        id: "execute",
        label: primaryDecision.action,
        status: "Planned",
        confidence: primaryDecision.confidence,
      },
      {
        id: "fallback",
        label: fallbackDecision.action,
        status: "Standby",
        confidence: fallbackDecision.confidence,
      },
    ];

    const planningScore = Math.round(
      adaptiveDecisionMatrix.decisionScore * 0.4 +
        predictiveBehaviorModel.predictionConfidence * 0.25 +
        ecosystemOrchestrator.ecosystemScore * 0.2 +
        proactiveTwinMe.readiness * 0.15,
    );

    const planState =
      planningScore >= 90
        ? "Execution Ready"
        : planningScore >= 75
          ? "Prepared"
          : planningScore >= 60
            ? "Developing"
            : "Learning";

    const predictedOutcome =
      threatAssessment.level === "Critical" || threatAssessment.level === "High"
        ? "Rapid intervention should reduce immediate crew risk."
        : predictiveBehaviorModel.nextBehavior;

    const executionWindow =
      adaptiveDecisionMatrix.selectedDecision.urgency >= 90
        ? "Now"
        : adaptiveDecisionMatrix.selectedDecision.urgency >= 65
          ? "Within 10 minutes"
          : adaptiveDecisionMatrix.selectedDecision.urgency >= 40
            ? "Within 30 minutes"
            : "Monitor";

    return {
      actionSteps,
      planningScore,
      planState,
      predictedOutcome,
      executionWindow,
      primaryDecision,
      fallbackDecision,
    };
  }, [
    adaptiveDecisionMatrix,
    intelligentContextFusion,
    predictiveBehaviorModel,
    ecosystemOrchestrator,
    proactiveTwinMe,
    threatAssessment,
  ]);

  const outcomeValidationEngine = useMemo(() => {
    const recentCheckins = crewCheckins.filter((checkin) => {
      const createdAt = new Date(checkin.created_at).getTime();

      if (!Number.isFinite(createdAt)) {
        return false;
      }

      const ageMinutes = (Date.now() - createdAt) / 60000;

      return ageMinutes <= 30;
    });

    const recentHelpSignals = recentCheckins.filter((checkin) =>
      (checkin.status || "").toLowerCase().includes("help"),
    ).length;

    const recentSafeSignals = recentCheckins.filter((checkin) => {
      const status = (checkin.status || "").toLowerCase();

      return (
        status.includes("active") ||
        status.includes("arrived") ||
        status.includes("safe")
      );
    }).length;

    const evidenceScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          predictiveActionPlanner.planningScore * 0.35 +
            adaptiveDecisionMatrix.decisionScore * 0.25 +
            intelligentContextFusion.fusionScore * 0.2 +
            recommendationFeedback.successRate * 0.2,
        ),
      ),
    );

    const riskChanged =
      recentHelpSignals > 0 ||
      threatAssessment.level === "Critical" ||
      threatAssessment.level === "High";

    const outcomeState = riskChanged
      ? "Reassess"
      : evidenceScore >= 90
        ? "Validated"
        : evidenceScore >= 75
          ? "Supported"
          : evidenceScore >= 60
            ? "Monitoring"
            : "Insufficient Evidence";

    const recommendedResponse =
      outcomeState === "Reassess"
        ? predictiveActionPlanner.fallbackDecision.action
        : outcomeState === "Validated" || outcomeState === "Supported"
          ? predictiveActionPlanner.primaryDecision.action
          : "Continue observing current signals before execution.";

    const validationMode =
      outcomeState === "Reassess"
        ? "Fallback"
        : outcomeState === "Validated"
          ? "Proceed"
          : "Observe";

    return {
      evidenceScore,
      outcomeState,
      validationMode,
      recommendedResponse,
      recentCheckins: recentCheckins.length,
      recentHelpSignals,
      recentSafeSignals,
      riskChanged,
    };
  }, [
    crewCheckins,
    predictiveActionPlanner,
    adaptiveDecisionMatrix,
    intelligentContextFusion,
    recommendationFeedback,
    threatAssessment,
  ]);

  const closedLoopLearning = useMemo(() => {
    const validationSuccess =
      outcomeValidationEngine.outcomeState === "Validated" ||
      outcomeValidationEngine.outcomeState === "Supported";

    const fallbackTriggered =
      outcomeValidationEngine.validationMode === "Fallback";

    const observedSignals =
      outcomeValidationEngine.recentCheckins +
      outcomeValidationEngine.recentHelpSignals +
      outcomeValidationEngine.recentSafeSignals;

    const learningGain = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          outcomeValidationEngine.evidenceScore * 0.3 +
            recommendationFeedback.successRate * 0.25 +
            adaptiveLearning.learningScore * 0.2 +
            predictiveActionPlanner.planningScore * 0.15 +
            adaptiveDecisionMatrix.decisionScore * 0.1,
        ),
      ),
    );

    const adjustment = fallbackTriggered
      ? -8
      : validationSuccess
        ? 6
        : observedSignals > 0
          ? 2
          : 0;

    const updatedConfidence = Math.round(
      Math.max(
        0,
        Math.min(100, adaptiveDashboard.recommendationAccuracy + adjustment),
      ),
    );

    const learningState =
      validationSuccess && learningGain >= 85
        ? "Reinforced"
        : fallbackTriggered
          ? "Correcting"
          : learningGain >= 70
            ? "Adapting"
            : "Observing";

    const learnedOutcome = fallbackTriggered
      ? "TwinMe detected a mismatch and is reducing confidence in the original action path."
      : validationSuccess
        ? "TwinMe validated the selected action and reinforced the supporting decision pattern."
        : "TwinMe is collecting more outcome evidence before changing future behavior.";

    const nextLearningAction = fallbackTriggered
      ? outcomeValidationEngine.recommendedResponse
      : validationSuccess
        ? "Increase confidence in similar future decisions."
        : "Continue monitoring before updating the decision model.";

    return {
      validationSuccess,
      fallbackTriggered,
      observedSignals,
      learningGain,
      adjustment,
      updatedConfidence,
      learningState,
      learnedOutcome,
      nextLearningAction,
    };
  }, [
    outcomeValidationEngine,
    recommendationFeedback,
    adaptiveLearning,
    predictiveActionPlanner,
    adaptiveDecisionMatrix,
    adaptiveDashboard,
  ]);

  const confidenceCalibrationEngine = useMemo(() => {
    const predictedConfidence = adaptiveDecisionMatrix.decisionScore;

    const observedEvidence = outcomeValidationEngine.evidenceScore;

    const confidenceGap = predictedConfidence - observedEvidence;

    const absoluteGap = Math.abs(confidenceGap);

    const calibrationState =
      absoluteGap <= 5
        ? "Well Calibrated"
        : confidenceGap > 15
          ? "Overconfident"
          : confidenceGap > 5
            ? "Slightly High"
            : confidenceGap < -15
              ? "Underconfident"
              : "Slightly Low";

    const calibrationAdjustment =
      calibrationState === "Overconfident"
        ? -10
        : calibrationState === "Slightly High"
          ? -4
          : calibrationState === "Underconfident"
            ? 10
            : calibrationState === "Slightly Low"
              ? 4
              : 0;

    const calibratedConfidence = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          closedLoopLearning.updatedConfidence + calibrationAdjustment,
        ),
      ),
    );

    const reliabilityScore = Math.round(
      Math.max(0, Math.min(100, 100 - absoluteGap)),
    );

    const reliabilityState =
      reliabilityScore >= 95
        ? "Excellent"
        : reliabilityScore >= 85
          ? "Reliable"
          : reliabilityScore >= 70
            ? "Developing"
            : "Unstable";

    const recommendation =
      calibrationState === "Overconfident"
        ? "Reduce confidence in similar decisions until stronger evidence is available."
        : calibrationState === "Underconfident"
          ? "Increase confidence when similar evidence patterns appear."
          : calibrationState === "Well Calibrated"
            ? "Maintain the current confidence model."
            : "Apply a small confidence correction and continue observing outcomes.";

    const confidenceDirection =
      calibrationAdjustment > 0
        ? "Increase"
        : calibrationAdjustment < 0
          ? "Decrease"
          : "Maintain";

    return {
      predictedConfidence,
      observedEvidence,
      confidenceGap,
      absoluteGap,
      calibrationState,
      calibrationAdjustment,
      calibratedConfidence,
      reliabilityScore,
      reliabilityState,
      recommendation,
      confidenceDirection,
    };
  }, [adaptiveDecisionMatrix, outcomeValidationEngine, closedLoopLearning]);

  const uncertaintyAwarenessEngine = useMemo(() => {
    const staleSignals = desyncMetrics.staleMemberCount;

    const missingSignals = desyncMetrics.missingLocationCount;

    const confidenceGap = confidenceCalibrationEngine.absoluteGap;

    const conflictingEvidence =
      outcomeValidationEngine.riskChanged &&
      closedLoopLearning.validationSuccess;

    const limitedEvidence = outcomeValidationEngine.recentCheckins === 0;

    const uncertaintyScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          staleSignals * 12 +
            missingSignals * 10 +
            confidenceGap * 0.8 +
            (conflictingEvidence ? 20 : 0) +
            (limitedEvidence ? 18 : 0),
        ),
      ),
    );

    const certaintyScore = Math.max(0, 100 - uncertaintyScore);

    const uncertaintyState =
      uncertaintyScore >= 75
        ? "High Uncertainty"
        : uncertaintyScore >= 50
          ? "Caution"
          : uncertaintyScore >= 25
            ? "Moderate"
            : "Low";

    const evidenceQuality =
      certaintyScore >= 90
        ? "Strong"
        : certaintyScore >= 75
          ? "Reliable"
          : certaintyScore >= 60
            ? "Limited"
            : "Weak";

    const requiresClarification =
      uncertaintyScore >= 50 || conflictingEvidence || limitedEvidence;

    const communicationMode =
      uncertaintyState === "High Uncertainty"
        ? "Ask Before Acting"
        : uncertaintyState === "Caution"
          ? "Explain Uncertainty"
          : uncertaintyState === "Moderate"
            ? "Use Careful Language"
            : "Confident";

    const uncertaintyReason = limitedEvidence
      ? "TwinMe does not yet have enough recent evidence to support a confident conclusion."
      : conflictingEvidence
        ? "Current signals contain conflicting evidence and require additional validation."
        : staleSignals > 0 || missingSignals > 0
          ? "Some crew signals are stale or incomplete."
          : confidenceGap > 10
            ? "Predicted confidence differs meaningfully from observed evidence."
            : "Current evidence is consistent and uncertainty is low.";

    const recommendedResponse = requiresClarification
      ? "Request updated signals or user confirmation before increasing autonomy."
      : "Proceed using the calibrated confidence model.";

    return {
      staleSignals,
      missingSignals,
      confidenceGap,
      conflictingEvidence,
      limitedEvidence,
      uncertaintyScore,
      certaintyScore,
      uncertaintyState,
      evidenceQuality,
      requiresClarification,
      communicationMode,
      uncertaintyReason,
      recommendedResponse,
    };
  }, [
    desyncMetrics,
    confidenceCalibrationEngine,
    outcomeValidationEngine,
    closedLoopLearning,
  ]);

  const responsibleCommunicationEngine = useMemo(() => {
    const uncertainty = uncertaintyAwarenessEngine.uncertaintyScore;

    const confidence = confidenceCalibrationEngine.calibratedConfidence;

    const priority = intelligentContextFusion.priority;

    const selectedAction = adaptiveDecisionMatrix.selectedDecision.action;

    const shouldAskFirst =
      uncertaintyAwarenessEngine.requiresClarification ||
      adaptiveDecisionMatrix.requiresConfirmation;

    const tone =
      priority === "Immediate"
        ? "Urgent"
        : uncertainty >= 50
          ? "Cautious"
          : emotionalContext.state === "Concerned" ||
              emotionalContext.state === "Critical"
            ? "Supportive"
            : "Clear";

    const certaintyLabel =
      confidence >= 90 && uncertainty < 20
        ? "High confidence"
        : confidence >= 75 && uncertainty < 40
          ? "Likely"
          : confidence >= 60
            ? "Possible"
            : "Uncertain";

    const disclosure =
      uncertainty >= 50
        ? uncertaintyAwarenessEngine.uncertaintyReason
        : confidenceCalibrationEngine.calibrationState !== "Well Calibrated"
          ? confidenceCalibrationEngine.recommendation
          : "Current signals support this recommendation.";

    const userMessage =
      priority === "Immediate"
        ? `Immediate attention may be needed. ${selectedAction}`
        : shouldAskFirst
          ? `${certaintyLabel}: ${selectedAction} TwinMe recommends confirming before proceeding.`
          : `${certaintyLabel}: ${selectedAction}`;

    const nextPrompt = shouldAskFirst
      ? "Would you like TwinMe to continue with this recommendation?"
      : "TwinMe can continue monitoring for changes.";

    const communicationScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          confidence * 0.45 +
            uncertaintyAwarenessEngine.certaintyScore * 0.35 +
            confidenceCalibrationEngine.reliabilityScore * 0.2,
        ),
      ),
    );

    const communicationState =
      communicationScore >= 90
        ? "Clear"
        : communicationScore >= 75
          ? "Qualified"
          : communicationScore >= 60
            ? "Cautious"
            : "Clarification Needed";

    return {
      tone,
      certaintyLabel,
      disclosure,
      userMessage,
      nextPrompt,
      communicationScore,
      communicationState,
      shouldAskFirst,
      priority,
    };
  }, [
    uncertaintyAwarenessEngine,
    confidenceCalibrationEngine,
    intelligentContextFusion,
    adaptiveDecisionMatrix,
    emotionalContext,
  ]);

  const userConsentControlEngine = useMemo(() => {
    const needsConfirmation =
      responsibleCommunicationEngine.shouldAskFirst ||
      uncertaintyAwarenessEngine.requiresClarification ||
      adaptiveDecisionMatrix.requiresConfirmation;

    const urgency = intelligentContextFusion.priority;

    const confidence = confidenceCalibrationEngine.calibratedConfidence;

    const autonomyAllowed =
      !needsConfirmation &&
      confidence >= 90 &&
      uncertaintyAwarenessEngine.uncertaintyScore < 20 &&
      urgency !== "Immediate";

    const controlMode = autonomyAllowed
      ? "Autonomous Ready"
      : urgency === "Immediate"
        ? "Safety Override Review"
        : needsConfirmation
          ? "User Approval Required"
          : "Assisted";

    const availableControls = [
      {
        id: "approve",
        label: "Approve Recommendation",
        enabled: needsConfirmation,
      },
      {
        id: "adjust",
        label: "Adjust Recommendation",
        enabled: true,
      },
      {
        id: "dismiss",
        label: "Dismiss",
        enabled: true,
      },
      {
        id: "pause",
        label: "Pause Proactive Actions",
        enabled: proactiveTwinMe.mode !== "Learning",
      },
    ];

    const consentScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          responsibleCommunicationEngine.communicationScore * 0.35 +
            uncertaintyAwarenessEngine.certaintyScore * 0.25 +
            confidenceCalibrationEngine.reliabilityScore * 0.2 +
            adaptiveDecisionMatrix.decisionScore * 0.2,
        ),
      ),
    );

    const consentState = autonomyAllowed
      ? "Permission Ready"
      : needsConfirmation
        ? "Awaiting Consent"
        : consentScore >= 75
          ? "Assisted Control"
          : "Restricted";

    const userPrompt = needsConfirmation
      ? responsibleCommunicationEngine.nextPrompt
      : autonomyAllowed
        ? "TwinMe can proceed while keeping the user informed."
        : "TwinMe will continue monitoring without taking action.";

    const governanceMessage =
      urgency === "Immediate"
        ? "Safety-related recommendations remain visible, but the user retains control over execution."
        : autonomyAllowed
          ? "Current evidence supports limited autonomous assistance within user-defined permissions."
          : "TwinMe will not execute this recommendation without user approval.";

    const recommendedControl =
      urgency === "Immediate"
        ? "Review Now"
        : needsConfirmation
          ? "Ask User"
          : autonomyAllowed
            ? "Proceed and Notify"
            : "Monitor";

    return {
      needsConfirmation,
      autonomyAllowed,
      controlMode,
      availableControls,
      consentScore,
      consentState,
      userPrompt,
      governanceMessage,
      recommendedControl,
      confidence,
      urgency,
    };
  }, [
    responsibleCommunicationEngine,
    uncertaintyAwarenessEngine,
    adaptiveDecisionMatrix,
    intelligentContextFusion,
    confidenceCalibrationEngine,
    proactiveTwinMe,
  ]);

  const permissionBoundaryEngine = useMemo(() => {
    const consentReady =
      userConsentControlEngine.consentState === "Permission Ready";

    const userApprovalRequired = userConsentControlEngine.needsConfirmation;

    const safetyReviewRequired =
      userConsentControlEngine.controlMode === "Safety Override Review";

    const uncertaintyBlocked =
      uncertaintyAwarenessEngine.uncertaintyScore >= 50;

    const confidenceBlocked =
      confidenceCalibrationEngine.calibratedConfidence < 75;

    const executionAllowed =
      consentReady &&
      userConsentControlEngine.autonomyAllowed &&
      !uncertaintyBlocked &&
      !confidenceBlocked &&
      !safetyReviewRequired;

    const allowedCapabilities = [
      {
        capability: "Monitor Signals",
        allowed: true,
        reason: "Passive monitoring remains available.",
      },
      {
        capability: "Surface Recommendation",
        allowed: true,
        reason: "TwinMe may present recommendations to the user.",
      },
      {
        capability: "Request Confirmation",
        allowed: userApprovalRequired,
        reason: userApprovalRequired
          ? "User approval is required before execution."
          : "Confirmation is not currently required.",
      },
      {
        capability: "Execute Suggested Action",
        allowed: executionAllowed,
        reason: executionAllowed
          ? "Consent, confidence, and certainty requirements are satisfied."
          : "Execution remains restricted by the current permission boundary.",
      },
      {
        capability: "Use Fallback Action",
        allowed:
          outcomeValidationEngine.validationMode === "Fallback" &&
          !userApprovalRequired,
        reason:
          outcomeValidationEngine.validationMode === "Fallback"
            ? "Fallback logic is active."
            : "Fallback execution is not currently needed.",
      },
    ];

    const allowedCount = allowedCapabilities.filter(
      (item) => item.allowed,
    ).length;

    const blockedCount = allowedCapabilities.length - allowedCount;

    const boundaryState = executionAllowed
      ? "Execution Permitted"
      : safetyReviewRequired
        ? "Safety Review"
        : userApprovalRequired
          ? "Awaiting Approval"
          : uncertaintyBlocked
            ? "Uncertainty Restricted"
            : confidenceBlocked
              ? "Confidence Restricted"
              : "Monitoring Only";

    const enforcementAction = executionAllowed
      ? "Proceed within the approved permission scope and notify the user."
      : userApprovalRequired
        ? "Request explicit user approval before taking action."
        : safetyReviewRequired
          ? "Present the safety recommendation for immediate user review."
          : "Continue monitoring without executing the recommendation.";

    const boundaryScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          userConsentControlEngine.consentScore * 0.35 +
            confidenceCalibrationEngine.calibratedConfidence * 0.25 +
            uncertaintyAwarenessEngine.certaintyScore * 0.25 +
            responsibleCommunicationEngine.communicationScore * 0.15,
        ),
      ),
    );

    const auditMessage = executionAllowed
      ? "Permission checks passed. Action remains limited to the approved scope."
      : "Permission checks prevented autonomous execution and preserved user control.";

    return {
      consentReady,
      userApprovalRequired,
      safetyReviewRequired,
      uncertaintyBlocked,
      confidenceBlocked,
      executionAllowed,
      allowedCapabilities,
      allowedCount,
      blockedCount,
      boundaryState,
      enforcementAction,
      boundaryScore,
      auditMessage,
    };
  }, [
    userConsentControlEngine,
    uncertaintyAwarenessEngine,
    confidenceCalibrationEngine,
    outcomeValidationEngine,
    responsibleCommunicationEngine,
  ]);

  const decisionAuditEngine = useMemo(() => {
    const auditSteps = [
      {
        id: "context",
        stage: "Context",
        status: intelligentContextFusion.fusionState,
        detail:
          `Primary context: ${intelligentContextFusion.primaryContext.name}. ` +
          `Priority: ${intelligentContextFusion.priority}.`,
      },
      {
        id: "decision",
        stage: "Decision",
        status: adaptiveDecisionMatrix.decisionState,
        detail:
          `Selected ${adaptiveDecisionMatrix.selectedDecision.source} ` +
          `with a score of ${adaptiveDecisionMatrix.decisionScore}.`,
      },
      {
        id: "planning",
        stage: "Planning",
        status: predictiveActionPlanner.planState,
        detail: `Execution window: ${predictiveActionPlanner.executionWindow}.`,
      },
      {
        id: "validation",
        stage: "Validation",
        status: outcomeValidationEngine.outcomeState,
        detail: `Evidence score: ${outcomeValidationEngine.evidenceScore}.`,
      },
      {
        id: "uncertainty",
        stage: "Uncertainty",
        status: uncertaintyAwarenessEngine.uncertaintyState,
        detail: `Evidence quality: ${uncertaintyAwarenessEngine.evidenceQuality}.`,
      },
      {
        id: "consent",
        stage: "Consent",
        status: userConsentControlEngine.consentState,
        detail: userConsentControlEngine.needsConfirmation
          ? "Explicit user confirmation is required."
          : "No additional confirmation is currently required.",
      },
      {
        id: "permission",
        stage: "Permission",
        status: permissionBoundaryEngine.boundaryState,
        detail: permissionBoundaryEngine.auditMessage,
      },
    ];

    const passedChecks = [
      intelligentContextFusion.fusionScore >= 60,
      adaptiveDecisionMatrix.decisionScore >= 60,
      outcomeValidationEngine.evidenceScore >= 60,
      uncertaintyAwarenessEngine.uncertaintyScore < 50,
      confidenceCalibrationEngine.calibratedConfidence >= 75,
      !userConsentControlEngine.needsConfirmation ||
        userConsentControlEngine.consentState === "Permission Ready",
    ].filter(Boolean).length;

    const totalChecks = 6;

    const auditScore = Math.round((passedChecks / totalChecks) * 100);

    const explainabilityState =
      auditScore >= 90
        ? "Fully Explainable"
        : auditScore >= 75
          ? "Explainable"
          : auditScore >= 60
            ? "Partially Explainable"
            : "Review Required";

    const decisionReason =
      `TwinMe selected the ${adaptiveDecisionMatrix.selectedDecision.source} ` +
      `recommendation because it ranked highest by urgency and confidence. ` +
      `The current primary context is ${intelligentContextFusion.primaryContext.name}.`;

    const boundaryReason = permissionBoundaryEngine.executionAllowed
      ? "Execution passed the consent, confidence, uncertainty, and permission checks."
      : permissionBoundaryEngine.enforcementAction;

    const userExplanation =
      `${responsibleCommunicationEngine.userMessage} ` +
      `${responsibleCommunicationEngine.disclosure}`;

    const traceId = [
      "TC",
      intelligentContextFusion.primaryContext.name
        .replace(/\s+/g, "")
        .slice(0, 4)
        .toUpperCase(),
      adaptiveDecisionMatrix.selectedDecision.source
        .replace(/\s+/g, "")
        .slice(0, 4)
        .toUpperCase(),
      auditScore,
    ].join("-");

    const finalDisposition = permissionBoundaryEngine.executionAllowed
      ? "Permitted"
      : userConsentControlEngine.needsConfirmation
        ? "Awaiting User"
        : permissionBoundaryEngine.safetyReviewRequired
          ? "Safety Review"
          : "Restricted";

    return {
      auditSteps,
      passedChecks,
      totalChecks,
      auditScore,
      explainabilityState,
      decisionReason,
      boundaryReason,
      userExplanation,
      traceId,
      finalDisposition,
    };
  }, [
    intelligentContextFusion,
    adaptiveDecisionMatrix,
    predictiveActionPlanner,
    outcomeValidationEngine,
    uncertaintyAwarenessEngine,
    confidenceCalibrationEngine,
    userConsentControlEngine,
    permissionBoundaryEngine,
    responsibleCommunicationEngine,
  ]);

  const safeExecutionReadinessEngine = useMemo(() => {
    const gates = [
      {
        id: "decision",
        name: "Decision Quality",
        passed: adaptiveDecisionMatrix.decisionScore >= 75,
        score: adaptiveDecisionMatrix.decisionScore,
      },
      {
        id: "evidence",
        name: "Evidence Support",
        passed: outcomeValidationEngine.evidenceScore >= 75,
        score: outcomeValidationEngine.evidenceScore,
      },
      {
        id: "confidence",
        name: "Calibrated Confidence",
        passed: confidenceCalibrationEngine.calibratedConfidence >= 75,
        score: confidenceCalibrationEngine.calibratedConfidence,
      },
      {
        id: "certainty",
        name: "Certainty",
        passed: uncertaintyAwarenessEngine.uncertaintyScore < 50,
        score: uncertaintyAwarenessEngine.certaintyScore,
      },
      {
        id: "consent",
        name: "Consent",
        passed:
          !userConsentControlEngine.needsConfirmation ||
          userConsentControlEngine.consentState === "Permission Ready",
        score: userConsentControlEngine.consentScore,
      },
      {
        id: "permission",
        name: "Permission Boundary",
        passed: permissionBoundaryEngine.executionAllowed,
        score: permissionBoundaryEngine.boundaryScore,
      },
      {
        id: "audit",
        name: "Auditability",
        passed: decisionAuditEngine.auditScore >= 75,
        score: decisionAuditEngine.auditScore,
      },
    ];

    const passedGates = gates.filter((gate) => gate.passed).length;

    const blockedGates = gates.filter((gate) => !gate.passed);

    const readinessScore = Math.round(
      gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length,
    );

    const allGatesPassed = passedGates === gates.length;

    const executionReady =
      allGatesPassed &&
      permissionBoundaryEngine.executionAllowed &&
      !userConsentControlEngine.needsConfirmation;

    const readinessState = executionReady
      ? "Execution Ready"
      : blockedGates.length <= 1 && readinessScore >= 80
        ? "Nearly Ready"
        : readinessScore >= 65
          ? "Conditional"
          : "Restricted";

    const executionMode = executionReady
      ? "Approved Scope"
      : userConsentControlEngine.needsConfirmation
        ? "Awaiting User"
        : permissionBoundaryEngine.safetyReviewRequired
          ? "Safety Review"
          : "Preparation Only";

    const nextRequiredGate = blockedGates.length > 0 ? blockedGates[0] : null;

    const readinessAction = executionReady
      ? predictiveActionPlanner.primaryDecision.action
      : nextRequiredGate
        ? `Resolve the ${nextRequiredGate.name} gate before execution.`
        : "Continue monitoring until execution requirements are satisfied.";

    const executionSummary = executionReady
      ? "All decision, evidence, consent, permission, uncertainty, and audit gates have passed."
      : `${passedGates} of ${gates.length} execution gates have passed.`;

    const rollbackReady =
      Boolean(predictiveActionPlanner.fallbackDecision?.action) &&
      outcomeValidationEngine.validationMode !== "Fallback";

    return {
      gates,
      passedGates,
      blockedGates,
      readinessScore,
      allGatesPassed,
      executionReady,
      readinessState,
      executionMode,
      nextRequiredGate,
      readinessAction,
      executionSummary,
      rollbackReady,
    };
  }, [
    adaptiveDecisionMatrix,
    outcomeValidationEngine,
    confidenceCalibrationEngine,
    uncertaintyAwarenessEngine,
    userConsentControlEngine,
    permissionBoundaryEngine,
    decisionAuditEngine,
    predictiveActionPlanner,
  ]);

  const executionSimulationEngine = useMemo(() => {
    const primaryAction = predictiveActionPlanner.primaryDecision.action;

    const fallbackAction = predictiveActionPlanner.fallbackDecision.action;

    const simulationFactors = [
      {
        id: "readiness",
        name: "Execution Readiness",
        score: safeExecutionReadinessEngine.readinessScore,
        passed: safeExecutionReadinessEngine.executionReady,
      },
      {
        id: "confidence",
        name: "Calibrated Confidence",
        score: confidenceCalibrationEngine.calibratedConfidence,
        passed: confidenceCalibrationEngine.calibratedConfidence >= 75,
      },
      {
        id: "evidence",
        name: "Evidence Support",
        score: outcomeValidationEngine.evidenceScore,
        passed: outcomeValidationEngine.evidenceScore >= 75,
      },
      {
        id: "certainty",
        name: "Signal Certainty",
        score: uncertaintyAwarenessEngine.certaintyScore,
        passed: uncertaintyAwarenessEngine.uncertaintyScore < 50,
      },
      {
        id: "permission",
        name: "Permission Boundary",
        score: permissionBoundaryEngine.boundaryScore,
        passed: permissionBoundaryEngine.executionAllowed,
      },
    ];

    const simulationScore = Math.round(
      simulationFactors.reduce((sum, factor) => sum + factor.score, 0) /
        simulationFactors.length,
    );

    const failedFactors = simulationFactors.filter((factor) => !factor.passed);

    const successProbability = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          simulationScore * 0.55 +
            predictiveActionPlanner.planningScore * 0.2 +
            adaptiveDecisionMatrix.decisionScore * 0.15 +
            decisionAuditEngine.auditScore * 0.1,
        ),
      ),
    );

    const riskProbability = Math.max(0, 100 - successProbability);

    const simulatedOutcome =
      successProbability >= 90
        ? "The planned action is highly likely to complete successfully within the approved scope."
        : successProbability >= 75
          ? "The planned action is likely to succeed, with continued monitoring recommended."
          : successProbability >= 60
            ? "The planned action may succeed, but unresolved factors could affect the outcome."
            : "The current action path carries significant uncertainty and should not proceed.";

    const failurePoint = failedFactors.length > 0 ? failedFactors[0] : null;

    const fallbackViable =
      safeExecutionReadinessEngine.rollbackReady &&
      Boolean(fallbackAction) &&
      outcomeValidationEngine.validationMode !== "Fallback";

    const simulationState =
      successProbability >= 90 && failedFactors.length === 0
        ? "Simulation Passed"
        : successProbability >= 75 && failedFactors.length <= 1
          ? "Conditional Pass"
          : successProbability >= 60
            ? "Review Required"
            : "Simulation Failed";

    const executionRecommendation =
      simulationState === "Simulation Passed"
        ? `Proceed with: ${primaryAction}`
        : simulationState === "Conditional Pass"
          ? "Proceed only with active monitoring and rollback readiness."
          : fallbackViable
            ? `Use the fallback path: ${fallbackAction}`
            : failurePoint
              ? `Resolve the ${failurePoint.name} factor before execution.`
              : "Continue monitoring before attempting execution.";

    const projectedResponse =
      threatAssessment.level === "Critical" || threatAssessment.level === "High"
        ? "Rapid intervention may reduce immediate crew risk."
        : predictiveActionPlanner.predictedOutcome;

    return {
      primaryAction,
      fallbackAction,
      simulationFactors,
      simulationScore,
      failedFactors,
      successProbability,
      riskProbability,
      simulatedOutcome,
      failurePoint,
      fallbackViable,
      simulationState,
      executionRecommendation,
      projectedResponse,
    };
  }, [
    predictiveActionPlanner,
    safeExecutionReadinessEngine,
    confidenceCalibrationEngine,
    outcomeValidationEngine,
    uncertaintyAwarenessEngine,
    permissionBoundaryEngine,
    adaptiveDecisionMatrix,
    decisionAuditEngine,
    threatAssessment,
  ]);

  const controlledExecutionOrchestrator = useMemo(() => {
    const simulationApproved =
      executionSimulationEngine.simulationState === "Simulation Passed" ||
      executionSimulationEngine.simulationState === "Conditional Pass";

    const permissionApproved = permissionBoundaryEngine.executionAllowed;

    const readinessApproved = safeExecutionReadinessEngine.executionReady;

    const consentApproved =
      !userConsentControlEngine.needsConfirmation &&
      userConsentControlEngine.autonomyAllowed;

    const executionAuthorized =
      simulationApproved &&
      permissionApproved &&
      readinessApproved &&
      consentApproved;

    const executionSteps = [
      {
        id: "verify",
        order: 1,
        label: "Verify live context",
        status: "Ready",
        required: true,
      },
      {
        id: "permission",
        order: 2,
        label: "Confirm permission boundary",
        status: permissionApproved ? "Passed" : "Blocked",
        required: true,
      },
      {
        id: "consent",
        order: 3,
        label: "Confirm user consent",
        status: consentApproved ? "Passed" : "Pending",
        required: true,
      },
      {
        id: "execute",
        order: 4,
        label: executionSimulationEngine.primaryAction,
        status: executionAuthorized ? "Authorized" : "Held",
        required: true,
      },
      {
        id: "monitor",
        order: 5,
        label: "Monitor execution outcome",
        status: executionAuthorized ? "Queued" : "Standby",
        required: true,
      },
      {
        id: "rollback",
        order: 6,
        label: executionSimulationEngine.fallbackAction,
        status: executionSimulationEngine.fallbackViable
          ? "Ready"
          : "Unavailable",
        required: false,
      },
    ];

    const blockedSteps = executionSteps.filter(
      (step) =>
        step.required &&
        (step.status === "Blocked" ||
          step.status === "Pending" ||
          step.status === "Held"),
    );

    const executionScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          executionSimulationEngine.successProbability * 0.3 +
            safeExecutionReadinessEngine.readinessScore * 0.25 +
            permissionBoundaryEngine.boundaryScore * 0.2 +
            userConsentControlEngine.consentScore * 0.15 +
            decisionAuditEngine.auditScore * 0.1,
        ),
      ),
    );

    const executionState = executionAuthorized
      ? "Authorized"
      : blockedSteps.length === 1 && executionScore >= 80
        ? "Pending Final Gate"
        : executionScore >= 65
          ? "Held for Review"
          : "Restricted";

    const executionMode = executionAuthorized
      ? "Controlled Execution"
      : userConsentControlEngine.needsConfirmation
        ? "Awaiting User Consent"
        : permissionBoundaryEngine.safetyReviewRequired
          ? "Safety Review"
          : "Monitor Only";

    const currentStep = executionAuthorized
      ? (executionSteps.find((step) => step.status === "Authorized") ??
        executionSteps[0])
      : (blockedSteps[0] ?? executionSteps[0]);

    const rollbackPlan = executionSimulationEngine.fallbackViable
      ? executionSimulationEngine.fallbackAction
      : "No automatic rollback is currently authorized.";

    const orchestrationAction = executionAuthorized
      ? `Authorize controlled execution of: ${executionSimulationEngine.primaryAction}`
      : currentStep
        ? `Resolve: ${currentStep.label}`
        : "Continue monitoring until all execution controls pass.";

    const guardrailMessage = executionAuthorized
      ? "Execution remains limited to the approved action, permission scope, and rollback plan."
      : "TwinMe has paused execution because one or more governance controls have not passed.";

    return {
      simulationApproved,
      permissionApproved,
      readinessApproved,
      consentApproved,
      executionAuthorized,
      executionSteps,
      blockedSteps,
      executionScore,
      executionState,
      executionMode,
      currentStep,
      rollbackPlan,
      orchestrationAction,
      guardrailMessage,
    };
  }, [
    executionSimulationEngine,
    permissionBoundaryEngine,
    safeExecutionReadinessEngine,
    userConsentControlEngine,
    decisionAuditEngine,
  ]);

  const liveExecutionMonitoringEngine = useMemo(() => {
    const executionActive = controlledExecutionOrchestrator.executionAuthorized;

    const recentSignals = crewCheckins.filter((checkin) => {
      const createdAt = new Date(checkin.created_at).getTime();

      if (!Number.isFinite(createdAt)) {
        return false;
      }

      const ageMinutes = (Date.now() - createdAt) / 60000;

      return ageMinutes <= 15;
    });

    const activeSignals = recentSignals.filter((checkin) => {
      const status = (checkin.status || "").toLowerCase();

      return (
        status.includes("active") ||
        status.includes("arrived") ||
        status.includes("safe")
      );
    }).length;

    const helpSignals = recentSignals.filter((checkin) =>
      (checkin.status || "").toLowerCase().includes("help"),
    ).length;

    const staleExecution = executionActive && recentSignals.length === 0;

    const riskEscalated =
      helpSignals > 0 ||
      threatAssessment.level === "Critical" ||
      threatAssessment.level === "High";

    const monitoringScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          controlledExecutionOrchestrator.executionScore * 0.3 +
            executionSimulationEngine.successProbability * 0.25 +
            outcomeValidationEngine.evidenceScore * 0.2 +
            confidenceCalibrationEngine.calibratedConfidence * 0.15 +
            uncertaintyAwarenessEngine.certaintyScore * 0.1,
        ),
      ),
    );

    const executionHealth = riskEscalated
      ? "Degrading"
      : staleExecution
        ? "Stalled"
        : executionActive && activeSignals > 0
          ? "Healthy"
          : executionActive
            ? "Monitoring"
            : "Standby";

    const progressState =
      executionHealth === "Healthy"
        ? "On Track"
        : executionHealth === "Monitoring"
          ? "In Progress"
          : executionHealth === "Stalled"
            ? "No Fresh Signals"
            : executionHealth === "Degrading"
              ? "Intervention Needed"
              : "Waiting";

    const rollbackRecommended =
      riskEscalated ||
      executionHealth === "Stalled" ||
      outcomeValidationEngine.validationMode === "Fallback";

    const recommendedAction = rollbackRecommended
      ? controlledExecutionOrchestrator.rollbackPlan
      : executionActive
        ? "Continue execution monitoring within the approved scope."
        : "Wait until controlled execution is authorized.";

    const monitoringMessage =
      executionHealth === "Healthy"
        ? "Execution signals are current and the action remains on track."
        : executionHealth === "Monitoring"
          ? "Execution is active and TwinMe is waiting for stronger outcome evidence."
          : executionHealth === "Stalled"
            ? "Execution has no fresh signals and requires review."
            : executionHealth === "Degrading"
              ? "Risk indicators increased during execution."
              : "No controlled execution is currently active.";

    const nextCheckpoint = executionActive
      ? helpSignals > 0
        ? "Immediate"
        : staleExecution
          ? "Now"
          : "Within 5 minutes"
      : "After authorization";

    return {
      executionActive,
      recentSignals: recentSignals.length,
      activeSignals,
      helpSignals,
      staleExecution,
      riskEscalated,
      monitoringScore,
      executionHealth,
      progressState,
      rollbackRecommended,
      recommendedAction,
      monitoringMessage,
      nextCheckpoint,
    };
  }, [
    crewCheckins,
    controlledExecutionOrchestrator,
    executionSimulationEngine,
    outcomeValidationEngine,
    confidenceCalibrationEngine,
    uncertaintyAwarenessEngine,
    threatAssessment,
  ]);

  const rollbackRecoveryEngine = useMemo(() => {
    const rollbackTriggered = liveExecutionMonitoringEngine.rollbackRecommended;

    const fallbackAvailable =
      executionSimulationEngine.fallbackViable &&
      Boolean(controlledExecutionOrchestrator.rollbackPlan);

    const executionDegraded =
      liveExecutionMonitoringEngine.executionHealth === "Degrading";

    const executionStalled =
      liveExecutionMonitoringEngine.executionHealth === "Stalled";

    const recoverySteps = [
      {
        id: "pause",
        order: 1,
        label: "Pause the active execution path",
        status: rollbackTriggered ? "Required" : "Standby",
      },
      {
        id: "contain",
        order: 2,
        label: "Contain the affected action scope",
        status:
          rollbackTriggered && permissionBoundaryEngine.executionAllowed
            ? "Ready"
            : "Standby",
      },
      {
        id: "fallback",
        order: 3,
        label: executionSimulationEngine.fallbackAction,
        status:
          rollbackTriggered && fallbackAvailable
            ? "Ready"
            : fallbackAvailable
              ? "Standby"
              : "Unavailable",
      },
      {
        id: "validate",
        order: 4,
        label: "Validate recovery outcome",
        status: rollbackTriggered ? "Queued" : "Standby",
      },
      {
        id: "resume",
        order: 5,
        label: "Resume only after readiness gates pass",
        status: "Locked",
      },
    ];

    const recoveryScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          executionSimulationEngine.successProbability * 0.25 +
            safeExecutionReadinessEngine.readinessScore * 0.2 +
            permissionBoundaryEngine.boundaryScore * 0.2 +
            outcomeValidationEngine.evidenceScore * 0.2 +
            decisionAuditEngine.auditScore * 0.15,
        ),
      ),
    );

    const recoveryState =
      rollbackTriggered && fallbackAvailable
        ? "Rollback Ready"
        : rollbackTriggered && !fallbackAvailable
          ? "Manual Recovery Required"
          : executionDegraded || executionStalled
            ? "Recovery Watch"
            : "Stable";

    const recoveryMode = rollbackTriggered
      ? fallbackAvailable
        ? "Controlled Rollback"
        : "Manual Intervention"
      : "Standby";

    const recoveryAction = rollbackTriggered
      ? fallbackAvailable
        ? controlledExecutionOrchestrator.rollbackPlan
        : "Pause execution and request user review before continuing."
      : "No rollback is currently required.";

    const resumeAllowed =
      !rollbackTriggered &&
      safeExecutionReadinessEngine.executionReady &&
      permissionBoundaryEngine.executionAllowed &&
      !userConsentControlEngine.needsConfirmation;

    const resumeCondition = resumeAllowed
      ? "All readiness, permission, and consent gates are satisfied."
      : "Resume remains blocked until readiness, permission, and consent checks pass.";

    const recoveryMessage = rollbackTriggered
      ? executionDegraded
        ? "Execution degraded. TwinMe recommends containing the current action and using the approved fallback path."
        : executionStalled
          ? "Execution stalled without fresh signals. TwinMe recommends pausing and recovering before resuming."
          : "Rollback criteria were met during live execution monitoring."
      : "Execution remains stable and no recovery action is required.";

    return {
      rollbackTriggered,
      fallbackAvailable,
      executionDegraded,
      executionStalled,
      recoverySteps,
      recoveryScore,
      recoveryState,
      recoveryMode,
      recoveryAction,
      resumeAllowed,
      resumeCondition,
      recoveryMessage,
    };
  }, [
    liveExecutionMonitoringEngine,
    executionSimulationEngine,
    controlledExecutionOrchestrator,
    safeExecutionReadinessEngine,
    permissionBoundaryEngine,
    outcomeValidationEngine,
    decisionAuditEngine,
    userConsentControlEngine,
  ]);

  const postExecutionOutcomeEngine = useMemo(() => {
    const executionCompleted =
      controlledExecutionOrchestrator.executionAuthorized &&
      liveExecutionMonitoringEngine.executionHealth === "Healthy";

    const recoveryCompleted =
      rollbackRecoveryEngine.rollbackTriggered &&
      rollbackRecoveryEngine.fallbackAvailable &&
      !liveExecutionMonitoringEngine.riskEscalated;

    const outcomeSignals = [
      {
        id: "monitoring",
        name: "Execution Health",
        score: liveExecutionMonitoringEngine.monitoringScore,
        positive:
          liveExecutionMonitoringEngine.executionHealth === "Healthy" ||
          liveExecutionMonitoringEngine.executionHealth === "Monitoring",
      },
      {
        id: "validation",
        name: "Outcome Evidence",
        score: outcomeValidationEngine.evidenceScore,
        positive:
          outcomeValidationEngine.outcomeState === "Validated" ||
          outcomeValidationEngine.outcomeState === "Supported",
      },
      {
        id: "recovery",
        name: "Recovery Readiness",
        score: rollbackRecoveryEngine.recoveryScore,
        positive:
          rollbackRecoveryEngine.recoveryState === "Stable" ||
          rollbackRecoveryEngine.recoveryState === "Rollback Ready",
      },
      {
        id: "confidence",
        name: "Calibrated Confidence",
        score: confidenceCalibrationEngine.calibratedConfidence,
        positive: confidenceCalibrationEngine.calibratedConfidence >= 75,
      },
      {
        id: "audit",
        name: "Audit Quality",
        score: decisionAuditEngine.auditScore,
        positive: decisionAuditEngine.auditScore >= 75,
      },
    ];

    const positiveSignals = outcomeSignals.filter(
      (signal) => signal.positive,
    ).length;

    const negativeSignals = outcomeSignals.length - positiveSignals;

    const outcomeScore = Math.round(
      outcomeSignals.reduce((sum, signal) => sum + signal.score, 0) /
        outcomeSignals.length,
    );

    const outcomeState =
      executionCompleted && positiveSignals >= 4
        ? "Successful"
        : recoveryCompleted && positiveSignals >= 3
          ? "Recovered"
          : liveExecutionMonitoringEngine.riskEscalated
            ? "Degraded"
            : rollbackRecoveryEngine.rollbackTriggered
              ? "Recovery In Progress"
              : controlledExecutionOrchestrator.executionAuthorized
                ? "Monitoring Outcome"
                : "No Execution";

    const outcomeClassification =
      outcomeState === "Successful"
        ? "Positive"
        : outcomeState === "Recovered"
          ? "Contained"
          : outcomeState === "Degraded"
            ? "Negative"
            : outcomeState === "Recovery In Progress"
              ? "Pending"
              : "Neutral";

    const learningWeight =
      outcomeState === "Successful"
        ? 1
        : outcomeState === "Recovered"
          ? 0.75
          : outcomeState === "Degraded"
            ? -1
            : outcomeState === "Recovery In Progress"
              ? -0.25
              : 0;

    const confidenceAdjustment =
      outcomeState === "Successful"
        ? 5
        : outcomeState === "Recovered"
          ? 2
          : outcomeState === "Degraded"
            ? -8
            : 0;

    const outcomeSummary =
      outcomeState === "Successful"
        ? "The approved execution path completed with healthy monitoring signals and strong supporting evidence."
        : outcomeState === "Recovered"
          ? "The original execution path required recovery, but the approved fallback contained the issue."
          : outcomeState === "Degraded"
            ? "Execution produced elevated risk signals and requires further review before similar actions are repeated."
            : outcomeState === "Recovery In Progress"
              ? "Recovery is active and TwinMe is waiting for validated post-recovery evidence."
              : outcomeState === "Monitoring Outcome"
                ? "Execution is active and the final outcome has not yet been established."
                : "No authorized execution has occurred, so no outcome can yet be scored.";

    const learnedPattern =
      outcomeState === "Successful"
        ? `Reinforce the ${adaptiveDecisionMatrix.selectedDecision.source} decision pattern under similar conditions.`
        : outcomeState === "Recovered"
          ? "Preserve the fallback path and reduce reliance on the original execution route."
          : outcomeState === "Degraded"
            ? "Lower confidence in similar action paths until stronger evidence and safer conditions are available."
            : "Continue collecting evidence before changing future behavior.";

    const nextAction =
      outcomeState === "Successful"
        ? "Store the successful execution pattern in long-term memory."
        : outcomeState === "Recovered"
          ? "Store both the failure point and successful recovery path."
          : outcomeState === "Degraded"
            ? "Block repeated execution and require user review."
            : "Continue monitoring until the outcome is resolved.";

    return {
      executionCompleted,
      recoveryCompleted,
      outcomeSignals,
      positiveSignals,
      negativeSignals,
      outcomeScore,
      outcomeState,
      outcomeClassification,
      learningWeight,
      confidenceAdjustment,
      outcomeSummary,
      learnedPattern,
      nextAction,
    };
  }, [
    controlledExecutionOrchestrator,
    liveExecutionMonitoringEngine,
    rollbackRecoveryEngine,
    outcomeValidationEngine,
    confidenceCalibrationEngine,
    decisionAuditEngine,
    adaptiveDecisionMatrix,
  ]);

  const experienceMemoryConsolidationEngine = useMemo(() => {
    const outcomeState = postExecutionOutcomeEngine.outcomeState;

    const memoryEligible =
      outcomeState === "Successful" ||
      outcomeState === "Recovered" ||
      outcomeState === "Degraded";

    const memoryType =
      outcomeState === "Successful"
        ? "Success Pattern"
        : outcomeState === "Recovered"
          ? "Recovery Pattern"
          : outcomeState === "Degraded"
            ? "Failure Pattern"
            : "Observation";

    const experienceTags = [
      intelligentContextFusion.primaryContext.name,
      adaptiveDecisionMatrix.selectedDecision.source,
      threatAssessment.level,
      postExecutionOutcomeEngine.outcomeClassification,
      controlledExecutionOrchestrator.executionMode,
    ].filter(Boolean);

    const memoryStrength = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          postExecutionOutcomeEngine.outcomeScore * 0.3 +
            decisionAuditEngine.auditScore * 0.2 +
            confidenceCalibrationEngine.calibratedConfidence * 0.2 +
            outcomeValidationEngine.evidenceScore * 0.15 +
            longTermMemory.memoryStrength * 0.15,
        ),
      ),
    );

    const retentionPriority =
      outcomeState === "Degraded"
        ? "High"
        : outcomeState === "Recovered"
          ? "High"
          : outcomeState === "Successful" && memoryStrength >= 85
            ? "High"
            : memoryStrength >= 70
              ? "Medium"
              : "Low";

    const reusablePattern =
      outcomeState === "Successful"
        ? postExecutionOutcomeEngine.learnedPattern
        : outcomeState === "Recovered"
          ? "Use the validated fallback path when similar failure conditions appear."
          : outcomeState === "Degraded"
            ? "Avoid repeating the original execution route without stronger evidence and explicit review."
            : "Continue collecting observations before creating a durable pattern.";

    const memorySummary = `${memoryType}: ${postExecutionOutcomeEngine.outcomeSummary}`;

    const consolidationState = !memoryEligible
      ? "Waiting for Outcome"
      : memoryStrength >= 85
        ? "Consolidated"
        : memoryStrength >= 70
          ? "Strengthening"
          : "Provisional";

    const storeInLongTermMemory = memoryEligible && memoryStrength >= 70;

    const updateConfidence = postExecutionOutcomeEngine.confidenceAdjustment;

    const retrievalCue = [
      intelligentContextFusion.primaryContext.name,
      adaptiveDecisionMatrix.selectedDecision.source,
      outcomeState,
    ]
      .join(" | ")
      .toLowerCase();

    const nextMemoryAction = storeInLongTermMemory
      ? "Store this experience with its context, outcome, confidence adjustment, and recovery path."
      : memoryEligible
        ? "Keep this experience in short-term memory until more supporting evidence is available."
        : "Wait for a completed or degraded outcome before consolidating memory.";

    return {
      memoryEligible,
      memoryType,
      experienceTags,
      memoryStrength,
      retentionPriority,
      reusablePattern,
      memorySummary,
      consolidationState,
      storeInLongTermMemory,
      updateConfidence,
      retrievalCue,
      nextMemoryAction,
    };
  }, [
    postExecutionOutcomeEngine,
    intelligentContextFusion,
    adaptiveDecisionMatrix,
    threatAssessment,
    controlledExecutionOrchestrator,
    decisionAuditEngine,
    confidenceCalibrationEngine,
    outcomeValidationEngine,
    longTermMemory,
  ]);

  const experienceRetrievalTransferEngine = useMemo(() => {
    const currentContext = [
      intelligentContextFusion.primaryContext.name,
      adaptiveDecisionMatrix.selectedDecision.source,
      threatAssessment.level,
      postExecutionOutcomeEngine.outcomeClassification,
    ]
      .filter(Boolean)
      .join(" | ")
      .toLowerCase();

    const storedCue = experienceMemoryConsolidationEngine.retrievalCue;

    const currentTokens = new Set(
      currentContext
        .split("|")
        .map((token) => token.trim())
        .filter(Boolean),
    );

    const storedTokens = new Set(
      storedCue
        .split("|")
        .map((token) => token.trim())
        .filter(Boolean),
    );

    const sharedTokens = [...currentTokens].filter((token) =>
      storedTokens.has(token),
    );

    const totalUniqueTokens = new Set([...currentTokens, ...storedTokens]).size;

    const similarityScore =
      totalUniqueTokens === 0
        ? 0
        : Math.round((sharedTokens.length / totalUniqueTokens) * 100);

    const memoryAvailable =
      experienceMemoryConsolidationEngine.storeInLongTermMemory ||
      experienceMemoryConsolidationEngine.memoryEligible;

    const retrievalEligible = memoryAvailable && similarityScore >= 25;

    const retrievedPattern = retrievalEligible
      ? experienceMemoryConsolidationEngine.reusablePattern
      : "No sufficiently similar experience pattern is currently available.";

    const transferStrength = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          similarityScore * 0.4 +
            experienceMemoryConsolidationEngine.memoryStrength * 0.35 +
            longTermMemory.memoryStrength * 0.15 +
            decisionAuditEngine.auditScore * 0.1,
        ),
      ),
    );

    const transferState = !memoryAvailable
      ? "No Stored Experience"
      : similarityScore >= 75 && transferStrength >= 80
        ? "Strong Transfer"
        : similarityScore >= 50 && transferStrength >= 65
          ? "Relevant Transfer"
          : similarityScore >= 25
            ? "Weak Transfer"
            : "No Match";

    const confidenceInfluence =
      transferState === "Strong Transfer"
        ? 8
        : transferState === "Relevant Transfer"
          ? 4
          : transferState === "Weak Transfer"
            ? 1
            : 0;

    const riskInfluence =
      experienceMemoryConsolidationEngine.memoryType === "Failure Pattern" &&
      retrievalEligible
        ? "Increase Caution"
        : experienceMemoryConsolidationEngine.memoryType ===
              "Recovery Pattern" && retrievalEligible
          ? "Prepare Fallback"
          : experienceMemoryConsolidationEngine.memoryType ===
                "Success Pattern" && retrievalEligible
            ? "Reinforce"
            : "Neutral";

    const transferredRecommendation = !retrievalEligible
      ? "Continue using current evidence without memory transfer."
      : riskInfluence === "Increase Caution"
        ? "Apply the prior failure pattern as a warning and require stronger evidence before execution."
        : riskInfluence === "Prepare Fallback"
          ? "Use the prior recovery experience to strengthen the fallback plan."
          : "Use the retrieved success pattern as supporting evidence for the current recommendation.";

    const transferReason = retrievalEligible
      ? `${sharedTokens.length} shared context signals matched the stored experience cue.`
      : "The current context did not meet the minimum similarity threshold for memory transfer.";

    const nextTransferAction =
      transferState === "Strong Transfer"
        ? "Apply the retrieved pattern with calibrated confidence and current permission checks."
        : transferState === "Relevant Transfer"
          ? "Use the retrieved experience as supporting context, not as the sole decision basis."
          : transferState === "Weak Transfer"
            ? "Keep the experience visible but prioritize fresh evidence."
            : "Continue collecting outcomes to build a stronger experience library.";

    return {
      currentContext,
      storedCue,
      sharedTokens,
      similarityScore,
      memoryAvailable,
      retrievalEligible,
      retrievedPattern,
      transferStrength,
      transferState,
      confidenceInfluence,
      riskInfluence,
      transferredRecommendation,
      transferReason,
      nextTransferAction,
    };
  }, [
    intelligentContextFusion,
    adaptiveDecisionMatrix,
    threatAssessment,
    postExecutionOutcomeEngine,
    experienceMemoryConsolidationEngine,
    longTermMemory,
    decisionAuditEngine,
  ]);

  const personalizedReasoningEngine = useMemo(() => {
    const personalizationScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          experienceRetrievalTransferEngine.transferStrength * 0.3 +
            adaptiveDashboard.learningProgress * 0.25 +
            experienceMemoryConsolidationEngine.memoryStrength * 0.2 +
            confidenceCalibrationEngine.calibratedConfidence * 0.15 +
            longTermMemory.memoryStrength * 0.1,
        ),
      ),
    );

    const reasoningProfile =
      personalizationScore >= 90
        ? "Highly Personalized"
        : personalizationScore >= 75
          ? "Adaptive"
          : personalizationScore >= 60
            ? "Learning"
            : "Generic";

    const reasoningMode = experienceRetrievalTransferEngine.retrievalEligible
      ? "Experience Guided"
      : "Evidence Guided";

    const recommendationStyle =
      reasoningProfile === "Highly Personalized"
        ? "Tailored"
        : reasoningProfile === "Adaptive"
          ? "Adaptive"
          : "Standard";

    const confidenceBoost =
      experienceRetrievalTransferEngine.confidenceInfluence +
      postExecutionOutcomeEngine.confidenceAdjustment;

    const reasoningSummary =
      reasoningMode === "Experience Guided"
        ? "TwinMe is combining past experiences with current evidence to personalize recommendations."
        : "TwinMe is relying primarily on current evidence while continuing to learn.";

    return {
      personalizationScore,
      reasoningProfile,
      reasoningMode,
      recommendationStyle,
      confidenceBoost,
      reasoningSummary,
    };
  }, [
    experienceRetrievalTransferEngine,
    adaptiveDashboard,
    experienceMemoryConsolidationEngine,
    confidenceCalibrationEngine,
    longTermMemory,
    postExecutionOutcomeEngine,
  ]);

  const dailyRelevanceRankingEngine = useMemo(() => {
    const relevanceItems = [
      {
        id: "priority",
        category: "Priority",
        title:
          threatAssessment.level === "Critical" ||
          threatAssessment.level === "High"
            ? responsibleCommunicationEngine.userMessage
            : predictiveActionPlanner.primaryDecision.action,
        urgency:
          threatAssessment.level === "Critical"
            ? 100
            : threatAssessment.level === "High"
              ? 90
              : intelligentContextFusion.priority === "Immediate"
                ? 85
                : 55,
        confidence: confidenceCalibrationEngine.calibratedConfidence,
        personalization: personalizedReasoningEngine.personalizationScore,
        actionable: true,
      },
      {
        id: "people",
        category: "People",
        title:
          crewStats.flagged > 0
            ? `${crewStats.flagged} crew member${
                crewStats.flagged === 1 ? "" : "s"
              } may need attention.`
            : relationshipIntelligence.insight,
        urgency:
          crewStats.flagged > 0
            ? 90
            : desyncMetrics.fragmented
              ? 75
              : desyncMetrics.drifting
                ? 60
                : 35,
        confidence: confidenceFactors.score,
        personalization: relationshipIntelligence.trustScore,
        actionable:
          crewStats.flagged > 0 ||
          desyncMetrics.fragmented ||
          desyncMetrics.drifting,
      },
      {
        id: "safety",
        category: "Safety",
        title: liveExecutionMonitoringEngine.riskEscalated
          ? liveExecutionMonitoringEngine.monitoringMessage
          : permissionBoundaryEngine.auditMessage,
        urgency: liveExecutionMonitoringEngine.riskEscalated
          ? 95
          : rollbackRecoveryEngine.rollbackTriggered
            ? 85
            : 40,
        confidence: liveExecutionMonitoringEngine.monitoringScore,
        personalization: personalizedReasoningEngine.personalizationScore,
        actionable:
          liveExecutionMonitoringEngine.riskEscalated ||
          rollbackRecoveryEngine.rollbackTriggered,
      },
      {
        id: "memory",
        category: "For You",
        title: experienceRetrievalTransferEngine.retrievalEligible
          ? experienceRetrievalTransferEngine.transferredRecommendation
          : personalizedReasoningEngine.reasoningSummary,
        urgency:
          experienceRetrievalTransferEngine.riskInfluence === "Increase Caution"
            ? 80
            : experienceRetrievalTransferEngine.retrievalEligible
              ? 55
              : 25,
        confidence: experienceRetrievalTransferEngine.transferStrength,
        personalization: personalizedReasoningEngine.personalizationScore,
        actionable: experienceRetrievalTransferEngine.retrievalEligible,
      },
      {
        id: "routine",
        category: "Lifestyle",
        title:
          routineIntelligence.totalCheckins > 0
            ? `Your current routine pattern is ${routineIntelligence.dominantPattern} with ${routineIntelligence.consistency}% consistency.`
            : "TwinMe is still learning your routine.",
        urgency:
          routineIntelligence.consistency >= 75
            ? 45
            : routineIntelligence.totalCheckins > 0
              ? 35
              : 15,
        confidence: routineIntelligence.consistency,
        personalization: adaptiveDashboard.learningProgress,
        actionable: routineIntelligence.totalCheckins > 0,
      },
    ];

    const rankedItems = relevanceItems
      .map((item) => {
        const relevanceScore = Math.round(
          Math.max(
            0,
            Math.min(
              100,
              item.urgency * 0.45 +
                item.confidence * 0.3 +
                item.personalization * 0.25,
            ),
          ),
        );

        return {
          ...item,
          relevanceScore,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const visibleItems = rankedItems.filter(
      (item) => item.relevanceScore >= 40 || item.urgency >= 80,
    );

    const topItem = visibleItems[0] ?? rankedItems[0];

    const relevanceState =
      topItem.relevanceScore >= 90
        ? "Critical Focus"
        : topItem.relevanceScore >= 75
          ? "High Relevance"
          : topItem.relevanceScore >= 60
            ? "Relevant"
            : "Low Activity";

    const dailyBriefingMode = visibleItems.some((item) => item.urgency >= 90)
      ? "Alert First"
      : visibleItems.length >= 3
        ? "Full Briefing"
        : visibleItems.length > 0
          ? "Focused Briefing"
          : "Quiet Mode";

    const hiddenItemCount = rankedItems.length - visibleItems.length;

    const briefingSummary = topItem
      ? `${topItem.category} is currently ranked highest with a relevance score of ${topItem.relevanceScore}%.`
      : "TwinMe has no high-relevance updates to surface right now.";

    const nextBriefingAction = topItem?.actionable
      ? `Surface the ${topItem.category} update first and provide an immediate action option.`
      : "Continue monitoring and only surface information when it becomes meaningfully relevant.";

    return {
      relevanceItems,
      rankedItems,
      visibleItems,
      topItem,
      relevanceState,
      dailyBriefingMode,
      hiddenItemCount,
      briefingSummary,
      nextBriefingAction,
    };
  }, [
    threatAssessment,
    responsibleCommunicationEngine,
    predictiveActionPlanner,
    intelligentContextFusion,
    confidenceCalibrationEngine,
    personalizedReasoningEngine,
    crewStats,
    relationshipIntelligence,
    desyncMetrics,
    predictiveCrewInsight,
    liveExecutionMonitoringEngine,
    permissionBoundaryEngine,
    rollbackRecoveryEngine,
    experienceRetrievalTransferEngine,
    routineIntelligence,
    adaptiveDashboard,
  ]);

  const fyiTodayCompositionEngine = useMemo(() => {
    const categoryOrder = [
      "Priority",
      "People",
      "Safety",
      "Travel",
      "Lifestyle",
      "Health",
      "For You",
    ];

    const iconByCategory: Record<string, string> = {
      Priority: "⚠️",
      People: "👥",
      Safety: "🛡️",
      Travel: "🚗",
      Lifestyle: "☕",
      Health: "💧",
      "For You": "✨",
    };

    const composedSections = dailyRelevanceRankingEngine.visibleItems
      .map((item) => ({
        id: item.id,
        category: item.category,
        icon: iconByCategory[item.category] ?? "•",
        title: item.title,
        relevanceScore: item.relevanceScore,
        urgency: item.urgency,
        confidence: item.confidence,
        actionable: item.actionable,
        emphasis:
          item.urgency >= 90
            ? "Urgent"
            : item.relevanceScore >= 75
              ? "High"
              : item.relevanceScore >= 60
                ? "Medium"
                : "Standard",
      }))
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }

        return (
          categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
        );
      });

    const primarySection = composedSections[0] ?? null;

    const supportingSections = composedSections.slice(1, 5);

    const sectionCount = composedSections.length;

    const compositionScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (primarySection?.relevanceScore ?? 0) * 0.4 +
            personalizedReasoningEngine.personalizationScore * 0.25 +
            confidenceCalibrationEngine.calibratedConfidence * 0.2 +
            adaptiveDashboard.learningProgress * 0.15,
        ),
      ),
    );

    const compositionState =
      sectionCount === 0
        ? "Quiet"
        : primarySection?.urgency >= 90
          ? "Alert Briefing"
          : sectionCount >= 4
            ? "Full Briefing"
            : sectionCount >= 2
              ? "Focused Briefing"
              : "Single Update";

    const heroMessage = primarySection
      ? primarySection.title
      : "Nothing urgent right now. TwinMe is still monitoring what matters to you.";

    const briefingIntro =
      compositionState === "Alert Briefing"
        ? "Here is what needs your attention first."
        : compositionState === "Full Briefing"
          ? "Here is what matters most in your day right now."
          : compositionState === "Focused Briefing"
            ? "A few things are worth your attention."
            : compositionState === "Single Update"
              ? "One update stands out right now."
              : "Your day is looking quiet so far.";

    const hiddenLowValueCount = dailyRelevanceRankingEngine.hiddenItemCount;

    const briefingTone =
      primarySection?.urgency >= 90
        ? "Direct"
        : personalizedReasoningEngine.recommendationStyle === "Tailored"
          ? "Personalized"
          : "Calm";

    const actionLabel = primarySection?.actionable
      ? primarySection.category === "People"
        ? "Check In"
        : primarySection.category === "Safety"
          ? "Review Now"
          : "View Action"
      : "View Details";

    const footerMessage =
      hiddenLowValueCount > 0
        ? `${hiddenLowValueCount} lower-priority update${
            hiddenLowValueCount === 1 ? " is" : "s are"
          } being kept out of view.`
        : "TwinMe is only showing updates that are relevant right now.";

    return {
      heading: "FYI Today",
      poweredBy: "Powered by TwinMe",
      composedSections,
      primarySection,
      supportingSections,
      sectionCount,
      compositionScore,
      compositionState,
      heroMessage,
      briefingIntro,
      hiddenLowValueCount,
      briefingTone,
      actionLabel,
      footerMessage,
    };
  }, [
    dailyRelevanceRankingEngine,
    personalizedReasoningEngine,
    confidenceCalibrationEngine,
    adaptiveDashboard,
  ]);

  const adaptiveFyiPresentationEngine = useMemo(() => {
    const primaryUrgency =
      fyiTodayCompositionEngine.primarySection?.urgency ?? 0;

    const primaryRelevance =
      fyiTodayCompositionEngine.primarySection?.relevanceScore ?? 0;

    const sectionDensity =
      fyiTodayCompositionEngine.sectionCount >= 5
        ? "Dense"
        : fyiTodayCompositionEngine.sectionCount >= 3
          ? "Balanced"
          : fyiTodayCompositionEngine.sectionCount >= 1
            ? "Light"
            : "Empty";

    const presentationMode =
      primaryUrgency >= 90
        ? "Alert First"
        : fyiTodayCompositionEngine.compositionState === "Full Briefing"
          ? "Expanded"
          : fyiTodayCompositionEngine.compositionState === "Focused Briefing"
            ? "Focused"
            : fyiTodayCompositionEngine.compositionState === "Single Update"
              ? "Single Card"
              : "Quiet";

    const visibleSectionLimit =
      presentationMode === "Alert First"
        ? 3
        : presentationMode === "Expanded"
          ? 5
          : presentationMode === "Focused"
            ? 3
            : presentationMode === "Single Card"
              ? 1
              : 0;

    const displayedSections = fyiTodayCompositionEngine.composedSections.slice(
      0,
      visibleSectionLimit,
    );

    const collapsedSections =
      fyiTodayCompositionEngine.composedSections.slice(visibleSectionLimit);

    const showPrimaryAction =
      Boolean(fyiTodayCompositionEngine.primarySection?.actionable) &&
      presentationMode !== "Quiet";

    const showSupportingDetails =
      presentationMode === "Expanded" || presentationMode === "Focused";

    const showScores =
      personalizedReasoningEngine.reasoningProfile === "Highly Personalized" ||
      decisionAuditEngine.explainabilityState === "Fully Explainable";

    const motionIntensity =
      primaryUrgency >= 90 ? "High" : primaryRelevance >= 75 ? "Medium" : "Low";

    const presentationScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          fyiTodayCompositionEngine.compositionScore * 0.4 +
            personalizedReasoningEngine.personalizationScore * 0.25 +
            dailyRelevanceRankingEngine.topItem.relevanceScore * 0.2 +
            adaptiveDashboard.learningProgress * 0.15,
        ),
      ),
    );

    const presentationState =
      presentationScore >= 90
        ? "Highly Optimized"
        : presentationScore >= 75
          ? "Optimized"
          : presentationScore >= 60
            ? "Adaptive"
            : "Basic";

    const visualPriority =
      primaryUrgency >= 90
        ? "Immediate Attention"
        : primaryRelevance >= 75
          ? "Strong Emphasis"
          : primaryRelevance >= 60
            ? "Moderate Emphasis"
            : "Subtle";

    const presentationMessage =
      presentationMode === "Alert First"
        ? "TwinMe is minimizing distraction and placing the most urgent update first."
        : presentationMode === "Expanded"
          ? "TwinMe is showing a broader briefing because several updates are currently relevant."
          : presentationMode === "Focused"
            ? "TwinMe is showing only the most relevant updates for the current moment."
            : presentationMode === "Single Card"
              ? "TwinMe is keeping the briefing simple because only one update stands out."
              : "TwinMe is staying quiet because nothing requires attention right now.";

    const nextPresentationAction =
      collapsedSections.length > 0
        ? `Keep ${collapsedSections.length} lower-priority section${
            collapsedSections.length === 1 ? "" : "s"
          } collapsed until the user requests more detail.`
        : "Keep the current presentation visible and continue monitoring for changes.";

    return {
      primaryUrgency,
      primaryRelevance,
      sectionDensity,
      presentationMode,
      visibleSectionLimit,
      displayedSections,
      collapsedSections,
      showPrimaryAction,
      showSupportingDetails,
      showScores,
      motionIntensity,
      presentationScore,
      presentationState,
      visualPriority,
      presentationMessage,
      nextPresentationAction,
    };
  }, [
    fyiTodayCompositionEngine,
    personalizedReasoningEngine,
    decisionAuditEngine,
    dailyRelevanceRankingEngine,
    adaptiveDashboard,
  ]);

  const fyiInteractionFeedbackEngine = useMemo(() => {
    const primarySection = fyiTodayCompositionEngine.primarySection;

    const actionAvailable =
      Boolean(primarySection?.actionable) &&
      adaptiveFyiPresentationEngine.showPrimaryAction;

    const confirmationRequired = userConsentControlEngine.needsConfirmation;

    const actionPermitted =
      actionAvailable &&
      permissionBoundaryEngine.executionAllowed &&
      !confirmationRequired;

    const primaryActionType = !primarySection
      ? "None"
      : primarySection.category === "People"
        ? "Check In"
        : primarySection.category === "Safety"
          ? "Review Safety"
          : primarySection.category === "Priority"
            ? "Review Priority"
            : primarySection.category === "Lifestyle"
              ? "Open Lifestyle"
              : primarySection.category === "For You"
                ? "View Insight"
                : "View Details";

    const primaryActionState = !actionAvailable
      ? "Unavailable"
      : confirmationRequired
        ? "Confirmation Required"
        : !permissionBoundaryEngine.executionAllowed
          ? "Permission Restricted"
          : "Ready";

    const feedbackTotal =
      recommendationFeedback.accepted + recommendationFeedback.ignored;

    const engagementRate =
      feedbackTotal === 0
        ? 0
        : Math.round((recommendationFeedback.accepted / feedbackTotal) * 100);

    const interactionScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          adaptiveFyiPresentationEngine.presentationScore * 0.3 +
            fyiTodayCompositionEngine.compositionScore * 0.25 +
            recommendationFeedback.successRate * 0.2 +
            personalizedReasoningEngine.personalizationScore * 0.15 +
            engagementRate * 0.1,
        ),
      ),
    );

    const interactionState =
      interactionScore >= 90
        ? "Highly Engaging"
        : interactionScore >= 75
          ? "Engaging"
          : interactionScore >= 60
            ? "Adaptive"
            : "Learning";

    const feedbackSignal =
      feedbackTotal === 0
        ? "No Feedback Yet"
        : recommendationFeedback.accepted > recommendationFeedback.ignored
          ? "Positive"
          : recommendationFeedback.ignored > recommendationFeedback.accepted
            ? "Needs Adjustment"
            : "Mixed";

    const learningAdjustment =
      feedbackSignal === "Positive"
        ? "Continue emphasizing similar FYI updates."
        : feedbackSignal === "Needs Adjustment"
          ? "Reduce prominence of similar updates and reassess relevance."
          : feedbackSignal === "Mixed"
            ? "Maintain the current ranking while collecting more feedback."
            : "Wait for user interaction before changing presentation behavior.";

    const actionMessage =
      primaryActionState === "Ready"
        ? `${primaryActionType} is available for the current primary FYI update.`
        : primaryActionState === "Confirmation Required"
          ? "TwinMe must receive user confirmation before proceeding."
          : primaryActionState === "Permission Restricted"
            ? "The current permission boundary prevents this action."
            : "The current FYI update does not require an immediate action.";

    const nextInteractionAction = actionPermitted
      ? `Present the ${primaryActionType} action and record the user's response.`
      : confirmationRequired
        ? "Ask the user for explicit confirmation."
        : "Continue monitoring without presenting an execution action.";

    return {
      primarySection,
      actionAvailable,
      confirmationRequired,
      actionPermitted,
      primaryActionType,
      primaryActionState,
      feedbackTotal,
      engagementRate,
      interactionScore,
      interactionState,
      feedbackSignal,
      learningAdjustment,
      actionMessage,
      nextInteractionAction,
    };
  }, [
    fyiTodayCompositionEngine,
    adaptiveFyiPresentationEngine,
    recommendationFeedback,
    personalizedReasoningEngine,
    userConsentControlEngine,
    permissionBoundaryEngine,
  ]);

  const contextualFyiTimingEngine = useMemo(() => {
    const primarySection = fyiTodayCompositionEngine.primarySection;

    const urgency = primarySection?.urgency ?? 0;

    const relevance = primarySection?.relevanceScore ?? 0;

    const riskActive =
      liveExecutionMonitoringEngine.riskEscalated ||
      threatAssessment.level === "Critical" ||
      threatAssessment.level === "High";

    const userActionRequired =
      Boolean(primarySection?.actionable) &&
      fyiInteractionFeedbackEngine.actionAvailable;

    const interruptionAllowed =
      permissionBoundaryEngine.executionAllowed &&
      !userConsentControlEngine.needsConfirmation;

    const timingPriority =
      riskActive || urgency >= 90
        ? "Immediate"
        : relevance >= 75 && userActionRequired
          ? "Soon"
          : relevance >= 60
            ? "When Convenient"
            : "Background";

    const deliveryMode =
      timingPriority === "Immediate"
        ? "Interruptive Alert"
        : timingPriority === "Soon"
          ? "Prominent FYI"
          : timingPriority === "When Convenient"
            ? "Passive Briefing"
            : "Silent Monitoring";

    const notificationAllowed =
      timingPriority === "Immediate"
        ? true
        : interruptionAllowed &&
          adaptiveFyiPresentationEngine.presentationMode !== "Quiet";

    const confirmationNeeded =
      userConsentControlEngine.needsConfirmation && userActionRequired;

    const delayMinutes =
      timingPriority === "Immediate"
        ? 0
        : timingPriority === "Soon"
          ? 5
          : timingPriority === "When Convenient"
            ? 30
            : 60;

    const timingScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          urgency * 0.35 +
            relevance * 0.3 +
            fyiInteractionFeedbackEngine.interactionScore * 0.15 +
            adaptiveFyiPresentationEngine.presentationScore * 0.1 +
            confidenceCalibrationEngine.calibratedConfidence * 0.1,
        ),
      ),
    );

    const timingState =
      timingScore >= 90
        ? "Surface Now"
        : timingScore >= 75
          ? "High Priority"
          : timingScore >= 60
            ? "Scheduled"
            : "Monitoring";

    const quietReason = notificationAllowed
      ? null
      : confirmationNeeded
        ? "TwinMe is waiting for explicit user confirmation."
        : adaptiveFyiPresentationEngine.presentationMode === "Quiet"
          ? "The current briefing does not justify interrupting the user."
          : "Permission settings prevent proactive delivery.";

    const deliveryMessage =
      timingPriority === "Immediate"
        ? "TwinMe should surface this update immediately because the current signal may require prompt attention."
        : timingPriority === "Soon"
          ? "TwinMe should surface this update shortly while it remains relevant."
          : timingPriority === "When Convenient"
            ? "TwinMe should include this update in the next natural briefing moment."
            : "TwinMe should continue monitoring without interrupting the user.";

    const nextTimingAction = notificationAllowed
      ? delayMinutes === 0
        ? "Present the FYI update immediately."
        : `Queue the FYI update for approximately ${delayMinutes} minutes from now.`
      : confirmationNeeded
        ? "Request user confirmation before presenting an action-oriented update."
        : "Keep the update in the background until urgency or relevance increases.";

    return {
      primarySection,
      urgency,
      relevance,
      riskActive,
      userActionRequired,
      interruptionAllowed,
      timingPriority,
      deliveryMode,
      notificationAllowed,
      confirmationNeeded,
      delayMinutes,
      timingScore,
      timingState,
      quietReason,
      deliveryMessage,
      nextTimingAction,
    };
  }, [
    fyiTodayCompositionEngine,
    liveExecutionMonitoringEngine,
    threatAssessment,
    fyiInteractionFeedbackEngine,
    permissionBoundaryEngine,
    userConsentControlEngine,
    adaptiveFyiPresentationEngine,
    confidenceCalibrationEngine,
  ]);

  const proactiveOpportunityEngine = useMemo(() => {
    const opportunities = dailyRelevanceRankingEngine.rankedItems
      .filter((item) => item.relevanceScore >= 60)
      .map((item) => ({
        ...item,
        opportunityScore: Math.round(
          Math.max(
            0,
            Math.min(
              100,
              item.relevanceScore * 0.45 +
                personalizedReasoningEngine.personalizationScore * 0.25 +
                confidenceCalibrationEngine.calibratedConfidence * 0.15 +
                adaptiveDashboard.learningProgress * 0.15,
            ),
          ),
        ),
      }))
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    const topOpportunity = opportunities[0] ?? null;

    const opportunityState = !topOpportunity
      ? "No Opportunities"
      : topOpportunity.opportunityScore >= 90
        ? "Immediate Opportunity"
        : topOpportunity.opportunityScore >= 75
          ? "Strong Opportunity"
          : "Potential Opportunity";

    const recommendation = topOpportunity
      ? `TwinMe recommends focusing on ${topOpportunity.category.toLowerCase()} because it currently provides the highest potential value.`
      : "Continue monitoring for emerging opportunities.";

    return {
      opportunities,
      topOpportunity,
      opportunityState,
      recommendation,
    };
  }, [
    dailyRelevanceRankingEngine,
    personalizedReasoningEngine,
    confidenceCalibrationEngine,
    adaptiveDashboard,
  ]);

  const opportunityActionPlanningEngine = useMemo(() => {
    const opportunity = proactiveOpportunityEngine.topOpportunity;

    const opportunityAvailable = Boolean(opportunity);

    const opportunityActionable = Boolean(opportunity?.actionable);

    const permissionApproved = permissionBoundaryEngine.executionAllowed;

    const confirmationRequired = userConsentControlEngine.needsConfirmation;

    const actionAuthorized =
      opportunityAvailable &&
      opportunityActionable &&
      permissionApproved &&
      !confirmationRequired;

    const actionPriority = !opportunity
      ? "None"
      : opportunity.opportunityScore >= 90
        ? "Immediate"
        : opportunity.opportunityScore >= 75
          ? "High"
          : opportunity.opportunityScore >= 60
            ? "Moderate"
            : "Low";

    const actionMode = actionAuthorized
      ? "Ready to Present"
      : confirmationRequired
        ? "Awaiting Confirmation"
        : !permissionApproved
          ? "Permission Restricted"
          : opportunityAvailable
            ? "Informational Only"
            : "Standby";

    const actionSteps = opportunity
      ? [
          {
            id: "review",
            order: 1,
            label: `Review the ${opportunity.category.toLowerCase()} opportunity`,
            status: "Ready",
          },
          {
            id: "context",
            order: 2,
            label: "Confirm the opportunity is still relevant",
            status: opportunity.relevanceScore >= 60 ? "Passed" : "Review",
          },
          {
            id: "permission",
            order: 3,
            label: "Verify consent and permission boundaries",
            status: confirmationRequired
              ? "Confirmation Required"
              : permissionApproved
                ? "Passed"
                : "Blocked",
          },
          {
            id: "present",
            order: 4,
            label:
              fyiInteractionFeedbackEngine.primaryActionType ||
              "Present opportunity action",
            status: actionAuthorized ? "Ready" : "Held",
          },
          {
            id: "monitor",
            order: 5,
            label: "Monitor the user response and resulting outcome",
            status: actionAuthorized ? "Queued" : "Standby",
          },
        ]
      : [];

    const blockedSteps = actionSteps.filter(
      (step) =>
        step.status === "Blocked" ||
        step.status === "Held" ||
        step.status === "Confirmation Required",
    );

    const planningScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (opportunity?.opportunityScore ?? 0) * 0.35 +
            personalizedReasoningEngine.personalizationScore * 0.2 +
            confidenceCalibrationEngine.calibratedConfidence * 0.15 +
            contextualFyiTimingEngine.timingScore * 0.15 +
            executionSimulationEngine.successProbability * 0.15,
        ),
      ),
    );

    const planningState = !opportunityAvailable
      ? "No Opportunity"
      : planningScore >= 90 && actionAuthorized
        ? "Action Ready"
        : planningScore >= 75
          ? "Plan Ready"
          : planningScore >= 60
            ? "Planning"
            : "Monitor";

    const suggestedAction = !opportunity
      ? "Continue monitoring for a useful opportunity."
      : actionAuthorized
        ? `${fyiInteractionFeedbackEngine.primaryActionType}: ${opportunity.title}`
        : confirmationRequired
          ? `Ask the user before proceeding with: ${opportunity.title}`
          : !permissionApproved
            ? `Keep the opportunity visible without executing: ${opportunity.title}`
            : `Show the opportunity as information: ${opportunity.title}`;

    const timingRecommendation = !opportunity
      ? "No delivery timing is required."
      : contextualFyiTimingEngine.notificationAllowed
        ? contextualFyiTimingEngine.delayMinutes === 0
          ? "Surface the opportunity now."
          : `Surface the opportunity in approximately ${contextualFyiTimingEngine.delayMinutes} minutes.`
        : "Keep the opportunity in the background until delivery is permitted.";

    const fallbackPlan = executionSimulationEngine.fallbackViable
      ? executionSimulationEngine.fallbackAction
      : "Pause and request user review if the opportunity conditions change.";

    const planningMessage = actionAuthorized
      ? "TwinMe has prepared a permission-aware opportunity plan that is ready to present."
      : confirmationRequired
        ? "The opportunity appears useful, but TwinMe must receive user confirmation first."
        : !permissionApproved
          ? "The opportunity remains visible, but the current permission boundary prevents action."
          : opportunityAvailable
            ? "TwinMe is treating this opportunity as informational."
            : "No qualifying opportunity currently requires planning.";

    const nextPlanningAction = actionAuthorized
      ? "Present the planned action and record the user's response."
      : confirmationRequired
        ? "Request explicit user confirmation."
        : opportunityAvailable
          ? "Continue monitoring until the action becomes permitted or more relevant."
          : "Wait for a qualifying opportunity.";

    return {
      opportunity,
      opportunityAvailable,
      opportunityActionable,
      permissionApproved,
      confirmationRequired,
      actionAuthorized,
      actionPriority,
      actionMode,
      actionSteps,
      blockedSteps,
      planningScore,
      planningState,
      suggestedAction,
      timingRecommendation,
      fallbackPlan,
      planningMessage,
      nextPlanningAction,
    };
  }, [
    proactiveOpportunityEngine,
    permissionBoundaryEngine,
    userConsentControlEngine,
    fyiInteractionFeedbackEngine,
    personalizedReasoningEngine,
    confidenceCalibrationEngine,
    contextualFyiTimingEngine,
    executionSimulationEngine,
  ]);

  const opportunityReadinessGateEngine = useMemo(() => {
    const opportunityPresent =
      opportunityActionPlanningEngine.opportunityAvailable;

    const planPrepared =
      opportunityActionPlanningEngine.planningState === "Action Ready" ||
      opportunityActionPlanningEngine.planningState === "Plan Ready" ||
      opportunityActionPlanningEngine.planningState === "Planning";

    const consentSatisfied =
      !opportunityActionPlanningEngine.confirmationRequired;

    const permissionSatisfied =
      opportunityActionPlanningEngine.permissionApproved;

    const timingSatisfied = contextualFyiTimingEngine.notificationAllowed;

    const simulationSatisfied =
      executionSimulationEngine.successProbability >= 60;

    const confidenceSatisfied =
      confidenceCalibrationEngine.calibratedConfidence >= 60;

    const fallbackSatisfied =
      executionSimulationEngine.fallbackViable ||
      Boolean(opportunityActionPlanningEngine.fallbackPlan);

    const riskAcceptable =
      !liveExecutionMonitoringEngine.riskEscalated &&
      threatAssessment.level !== "Critical";

    const readinessChecks = [
      {
        id: "opportunity",
        label: "Opportunity detected",
        passed: opportunityPresent,
      },
      {
        id: "plan",
        label: "Action plan prepared",
        passed: planPrepared,
      },
      {
        id: "consent",
        label: "Consent requirement satisfied",
        passed: consentSatisfied,
      },
      {
        id: "permission",
        label: "Permission boundary satisfied",
        passed: permissionSatisfied,
      },
      {
        id: "timing",
        label: "Delivery timing approved",
        passed: timingSatisfied,
      },
      {
        id: "simulation",
        label: "Simulation confidence acceptable",
        passed: simulationSatisfied,
      },
      {
        id: "confidence",
        label: "Decision confidence acceptable",
        passed: confidenceSatisfied,
      },
      {
        id: "fallback",
        label: "Fallback protection available",
        passed: fallbackSatisfied,
      },
      {
        id: "risk",
        label: "Current risk remains acceptable",
        passed: riskAcceptable,
      },
    ];

    const passedChecks = readinessChecks.filter((check) => check.passed).length;

    const failedChecks = readinessChecks.length - passedChecks;

    const readinessScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          opportunityActionPlanningEngine.planningScore * 0.25 +
            executionSimulationEngine.successProbability * 0.2 +
            confidenceCalibrationEngine.calibratedConfidence * 0.15 +
            contextualFyiTimingEngine.timingScore * 0.15 +
            permissionBoundaryEngine.boundaryScore * 0.15 +
            safeExecutionReadinessEngine.readinessScore * 0.1,
        ),
      ),
    );

    const allCriticalChecksPassed =
      opportunityPresent &&
      planPrepared &&
      consentSatisfied &&
      permissionSatisfied &&
      simulationSatisfied &&
      riskAcceptable;

    const opportunityReady = allCriticalChecksPassed && readinessScore >= 70;

    const readinessState =
      opportunityReady && readinessScore >= 90
        ? "Fully Ready"
        : opportunityReady
          ? "Ready"
          : failedChecks <= 2 && opportunityPresent
            ? "Nearly Ready"
            : opportunityPresent
              ? "Blocked"
              : "Standby";

    const blockingReasons = readinessChecks
      .filter((check) => !check.passed)
      .map((check) => check.label);

    const gateDecision = opportunityReady
      ? "Pass"
      : opportunityPresent
        ? "Hold"
        : "Standby";

    const readinessMessage = opportunityReady
      ? "The opportunity plan passed the readiness gate and can be presented within the approved boundaries."
      : opportunityPresent
        ? `The opportunity plan is being held because ${failedChecks} readiness check${
            failedChecks === 1 ? " has" : "s have"
          } not passed.`
        : "No opportunity is currently available for readiness evaluation.";

    const nextReadinessAction = opportunityReady
      ? "Pass the opportunity plan to the controlled presentation layer."
      : blockingReasons.length > 0
        ? `Resolve: ${blockingReasons.join(", ")}.`
        : "Continue monitoring for a qualifying opportunity.";

    return {
      opportunityPresent,
      planPrepared,
      consentSatisfied,
      permissionSatisfied,
      timingSatisfied,
      simulationSatisfied,
      confidenceSatisfied,
      fallbackSatisfied,
      riskAcceptable,
      readinessChecks,
      passedChecks,
      failedChecks,
      readinessScore,
      allCriticalChecksPassed,
      opportunityReady,
      readinessState,
      blockingReasons,
      gateDecision,
      readinessMessage,
      nextReadinessAction,
    };
  }, [
    opportunityActionPlanningEngine,
    contextualFyiTimingEngine,
    executionSimulationEngine,
    confidenceCalibrationEngine,
    liveExecutionMonitoringEngine,
    threatAssessment,
    permissionBoundaryEngine,
    safeExecutionReadinessEngine,
  ]);

  const controlledOpportunityPresentationEngine = useMemo(() => {
    const opportunity = opportunityActionPlanningEngine.opportunity;

    const readinessPassed =
      opportunityReadinessGateEngine.gateDecision === "Pass" &&
      opportunityReadinessGateEngine.opportunityReady;

    const confirmationRequired =
      opportunityActionPlanningEngine.confirmationRequired;

    const permissionApproved =
      opportunityActionPlanningEngine.permissionApproved;

    const notificationApproved = contextualFyiTimingEngine.notificationAllowed;

    const presentationAllowed =
      Boolean(opportunity) &&
      readinessPassed &&
      permissionApproved &&
      notificationApproved &&
      !confirmationRequired;

    const presentationDecision = presentationAllowed
      ? "Present"
      : confirmationRequired && Boolean(opportunity)
        ? "Request Confirmation"
        : opportunityReadinessGateEngine.gateDecision === "Hold"
          ? "Hold"
          : opportunity
            ? "Suppress"
            : "Standby";

    const presentationMode =
      presentationDecision === "Present"
        ? contextualFyiTimingEngine.timingPriority === "Immediate"
          ? "Immediate Opportunity Card"
          : "FYI Opportunity Card"
        : presentationDecision === "Request Confirmation"
          ? "Confirmation Prompt"
          : presentationDecision === "Hold"
            ? "Background Hold"
            : presentationDecision === "Suppress"
              ? "Silent Monitoring"
              : "Standby";

    const presentationPriority = opportunityActionPlanningEngine.actionPriority;

    const presentationTitle = opportunity
      ? `${opportunity.category} Opportunity`
      : "No Active Opportunity";

    const presentationBody = opportunity
      ? opportunity.title
      : "TwinMe is continuing to monitor for a relevant opportunity.";

    const primaryActionLabel =
      presentationDecision === "Present"
        ? fyiInteractionFeedbackEngine.primaryActionType
        : presentationDecision === "Request Confirmation"
          ? "Review & Confirm"
          : presentationDecision === "Hold"
            ? "Review Later"
            : "No Action";

    const secondaryActionLabel =
      presentationDecision === "Present" ||
      presentationDecision === "Request Confirmation"
        ? "Not Now"
        : "Dismiss";

    const explanation =
      presentationDecision === "Present"
        ? opportunityActionPlanningEngine.planningMessage
        : presentationDecision === "Request Confirmation"
          ? "TwinMe identified a useful opportunity but requires explicit confirmation before proceeding."
          : presentationDecision === "Hold"
            ? opportunityReadinessGateEngine.readinessMessage
            : opportunity
              ? "TwinMe is keeping this opportunity out of view because the presentation conditions have not been satisfied."
              : "No qualifying opportunity is currently available.";

    const presentationScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          opportunityReadinessGateEngine.readinessScore * 0.35 +
            opportunityActionPlanningEngine.planningScore * 0.25 +
            contextualFyiTimingEngine.timingScore * 0.15 +
            adaptiveFyiPresentationEngine.presentationScore * 0.15 +
            fyiInteractionFeedbackEngine.interactionScore * 0.1,
        ),
      ),
    );

    const presentationState =
      presentationAllowed && presentationScore >= 90
        ? "Fully Prepared"
        : presentationAllowed
          ? "Prepared"
          : presentationDecision === "Request Confirmation"
            ? "Awaiting User"
            : presentationDecision === "Hold"
              ? "Held"
              : presentationDecision === "Suppress"
                ? "Suppressed"
                : "Standby";

    const auditSummary = [
      {
        id: "readiness",
        label: "Readiness gate",
        status: readinessPassed ? "Passed" : "Held",
      },
      {
        id: "permission",
        label: "Permission boundary",
        status: permissionApproved ? "Approved" : "Blocked",
      },
      {
        id: "notification",
        label: "Delivery permission",
        status: notificationApproved ? "Approved" : "Blocked",
      },
      {
        id: "confirmation",
        label: "User confirmation",
        status: confirmationRequired ? "Required" : "Not Required",
      },
    ];

    const blockedConditions = auditSummary
      .filter(
        (item) =>
          item.status === "Held" ||
          item.status === "Blocked" ||
          item.status === "Required",
      )
      .map((item) => item.label);

    const nextPresentationAction =
      presentationDecision === "Present"
        ? "Render the controlled opportunity card and record the user's response."
        : presentationDecision === "Request Confirmation"
          ? "Render a confirmation prompt without executing the suggested action."
          : presentationDecision === "Hold"
            ? `Keep the opportunity in the background until these conditions resolve: ${blockedConditions.join(", ")}.`
            : opportunity
              ? "Continue monitoring and reassess the presentation conditions."
              : "Wait for the next qualifying opportunity.";

    return {
      opportunity,
      readinessPassed,
      confirmationRequired,
      permissionApproved,
      notificationApproved,
      presentationAllowed,
      presentationDecision,
      presentationMode,
      presentationPriority,
      presentationTitle,
      presentationBody,
      primaryActionLabel,
      secondaryActionLabel,
      explanation,
      presentationScore,
      presentationState,
      auditSummary,
      blockedConditions,
      nextPresentationAction,
    };
  }, [
    opportunityActionPlanningEngine,
    opportunityReadinessGateEngine,
    contextualFyiTimingEngine,
    fyiInteractionFeedbackEngine,
    adaptiveFyiPresentationEngine,
  ]);

  const opportunityResponseIntelligenceEngine = useMemo(() => {
    const presentationDecision =
      controlledOpportunityPresentationEngine.presentationDecision;

    const opportunityPresented = presentationDecision === "Present";

    const confirmationRequested =
      presentationDecision === "Request Confirmation";

    const opportunityHeld = presentationDecision === "Hold";

    const opportunitySuppressed = presentationDecision === "Suppress";

    const historicalResponses =
      recommendationFeedback.accepted + recommendationFeedback.ignored;

    const historicalAcceptanceRate =
      historicalResponses === 0
        ? 0
        : Math.round(
            (recommendationFeedback.accepted / historicalResponses) * 100,
          );

    const likelyResponse = !controlledOpportunityPresentationEngine.opportunity
      ? "No Response Expected"
      : confirmationRequested
        ? "Awaiting Confirmation"
        : opportunityPresented && historicalAcceptanceRate >= 70
          ? "Likely Accept"
          : opportunityPresented && historicalAcceptanceRate >= 40
            ? "Undetermined"
            : opportunityPresented
              ? "Likely Ignore"
              : opportunityHeld
                ? "Deferred"
                : opportunitySuppressed
                  ? "Not Presented"
                  : "Standby";

    const responseConfidence = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          controlledOpportunityPresentationEngine.presentationScore * 0.3 +
            fyiInteractionFeedbackEngine.interactionScore * 0.25 +
            recommendationFeedback.successRate * 0.2 +
            opportunityReadinessGateEngine.readinessScore * 0.15 +
            contextualFyiTimingEngine.timingScore * 0.1,
        ),
      ),
    );

    const responseState =
      likelyResponse === "Likely Accept" && responseConfidence >= 80
        ? "Positive Response Expected"
        : likelyResponse === "Likely Ignore"
          ? "Low Engagement Expected"
          : likelyResponse === "Awaiting Confirmation"
            ? "User Decision Required"
            : likelyResponse === "Deferred"
              ? "Deferred"
              : likelyResponse === "Not Presented"
                ? "Suppressed"
                : likelyResponse === "No Response Expected"
                  ? "Inactive"
                  : "Monitoring";

    const learningSignal =
      likelyResponse === "Likely Accept"
        ? "Positive"
        : likelyResponse === "Likely Ignore"
          ? "Negative"
          : likelyResponse === "Deferred"
            ? "Delayed"
            : likelyResponse === "Awaiting Confirmation"
              ? "Pending"
              : "Neutral";

    const expectedOutcome =
      likelyResponse === "Likely Accept"
        ? "The user is likely to engage with the presented opportunity."
        : likelyResponse === "Likely Ignore"
          ? "The opportunity may require lower prominence or improved relevance."
          : likelyResponse === "Awaiting Confirmation"
            ? "TwinMe must wait for the user’s explicit response."
            : likelyResponse === "Deferred"
              ? "The opportunity should remain available for a later briefing."
              : likelyResponse === "Not Presented"
                ? "No user-response signal will be generated while the opportunity remains suppressed."
                : "TwinMe is waiting for a presentation or response event.";

    const feedbackAdjustment =
      learningSignal === "Positive"
        ? "Reinforce similar opportunity timing, category, and presentation patterns."
        : learningSignal === "Negative"
          ? "Reduce similar opportunity prominence and reassess personalization."
          : learningSignal === "Delayed"
            ? "Preserve the opportunity but present it at a more suitable time."
            : learningSignal === "Pending"
              ? "Do not update the learning model until the user responds."
              : "Maintain the current model without adjustment.";

    const followUpAction =
      likelyResponse === "Likely Accept"
        ? "Prepare to record acceptance and monitor the resulting outcome."
        : likelyResponse === "Likely Ignore"
          ? "Offer a less intrusive dismissal path and record the ignored signal."
          : likelyResponse === "Awaiting Confirmation"
            ? "Wait for explicit confirmation before continuing."
            : likelyResponse === "Deferred"
              ? "Return the opportunity to the timing engine for later delivery."
              : likelyResponse === "Not Presented"
                ? "Continue monitoring until presentation conditions improve."
                : "Wait for an opportunity-response event.";

    const responseSummary = `${responseState}: ${expectedOutcome}`;

    return {
      opportunityPresented,
      confirmationRequested,
      opportunityHeld,
      opportunitySuppressed,
      historicalResponses,
      historicalAcceptanceRate,
      likelyResponse,
      responseConfidence,
      responseState,
      learningSignal,
      expectedOutcome,
      feedbackAdjustment,
      followUpAction,
      responseSummary,
    };
  }, [
    controlledOpportunityPresentationEngine,
    recommendationFeedback,
    fyiInteractionFeedbackEngine,
    opportunityReadinessGateEngine,
    contextualFyiTimingEngine,
  ]);

  const opportunityOutcomeIntegrationEngine = useMemo(() => {
    const responseState = opportunityResponseIntelligenceEngine.responseState;

    const opportunityPresented =
      opportunityResponseIntelligenceEngine.opportunityPresented;

    const opportunityDeferred =
      opportunityResponseIntelligenceEngine.opportunityHeld;

    const opportunitySuppressed =
      opportunityResponseIntelligenceEngine.opportunitySuppressed;

    const positiveResponse =
      opportunityResponseIntelligenceEngine.learningSignal === "Positive";

    const negativeResponse =
      opportunityResponseIntelligenceEngine.learningSignal === "Negative";

    const pendingResponse =
      opportunityResponseIntelligenceEngine.learningSignal === "Pending";

    const delayedResponse =
      opportunityResponseIntelligenceEngine.learningSignal === "Delayed";

    const outcomeAvailable =
      opportunityPresented ||
      opportunityDeferred ||
      opportunitySuppressed ||
      pendingResponse;

    const observedOutcome = positiveResponse
      ? "Accepted"
      : negativeResponse
        ? "Ignored"
        : pendingResponse
          ? "Pending Confirmation"
          : delayedResponse
            ? "Deferred"
            : opportunitySuppressed
              ? "Not Presented"
              : opportunityPresented
                ? "Monitoring"
                : "No Outcome";

    const outcomeQuality =
      observedOutcome === "Accepted"
        ? "Positive"
        : observedOutcome === "Ignored"
          ? "Negative"
          : observedOutcome === "Deferred"
            ? "Delayed"
            : observedOutcome === "Pending Confirmation"
              ? "Pending"
              : "Neutral";

    const usefulnessScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          controlledOpportunityPresentationEngine.presentationScore * 0.2 +
            opportunityResponseIntelligenceEngine.responseConfidence * 0.2 +
            opportunityReadinessGateEngine.readinessScore * 0.15 +
            opportunityActionPlanningEngine.planningScore * 0.15 +
            recommendationFeedback.successRate * 0.15 +
            postExecutionOutcomeEngine.outcomeScore * 0.15,
        ),
      ),
    );

    const outcomeState = !outcomeAvailable
      ? "Waiting"
      : observedOutcome === "Accepted" && usefulnessScore >= 80
        ? "Validated"
        : observedOutcome === "Accepted"
          ? "Positive"
          : observedOutcome === "Ignored"
            ? "Needs Adjustment"
            : observedOutcome === "Deferred"
              ? "Deferred"
              : observedOutcome === "Pending Confirmation"
                ? "Pending"
                : observedOutcome === "Not Presented"
                  ? "Suppressed"
                  : "Monitoring";

    const learningImpact =
      outcomeQuality === "Positive"
        ? "Increase confidence in similar proactive opportunity patterns."
        : outcomeQuality === "Negative"
          ? "Reduce confidence and prominence for similar opportunities."
          : outcomeQuality === "Delayed"
            ? "Preserve the opportunity pattern but adjust timing."
            : outcomeQuality === "Pending"
              ? "Hold learning updates until the user responds."
              : "Make no major learning adjustment.";

    const memoryClassification =
      outcomeState === "Validated"
        ? "Successful Opportunity Pattern"
        : outcomeState === "Positive"
          ? "Promising Opportunity Pattern"
          : outcomeState === "Needs Adjustment"
            ? "Low-Engagement Opportunity Pattern"
            : outcomeState === "Deferred"
              ? "Timing-Sensitive Opportunity Pattern"
              : outcomeState === "Suppressed"
                ? "Suppressed Opportunity Observation"
                : "Opportunity Observation";

    const confidenceAdjustment =
      outcomeState === "Validated"
        ? 8
        : outcomeState === "Positive"
          ? 4
          : outcomeState === "Needs Adjustment"
            ? -6
            : outcomeState === "Deferred"
              ? -1
              : 0;

    const rankingAdjustment =
      outcomeState === "Validated"
        ? 10
        : outcomeState === "Positive"
          ? 5
          : outcomeState === "Needs Adjustment"
            ? -10
            : outcomeState === "Deferred"
              ? -3
              : 0;

    const timingAdjustment =
      outcomeState === "Deferred"
        ? "Reschedule Later"
        : outcomeState === "Needs Adjustment"
          ? "Reduce Frequency"
          : outcomeState === "Validated" || outcomeState === "Positive"
            ? "Preserve Timing"
            : "No Change";

    const memoryEligible =
      outcomeState === "Validated" ||
      outcomeState === "Positive" ||
      outcomeState === "Needs Adjustment" ||
      outcomeState === "Deferred";

    const integrationMessage =
      outcomeState === "Validated"
        ? "TwinMe validated this proactive opportunity as useful and can strengthen similar future recommendations."
        : outcomeState === "Positive"
          ? "The opportunity produced a positive response and should influence future ranking."
          : outcomeState === "Needs Adjustment"
            ? "The opportunity did not engage the user and should be presented less prominently in similar contexts."
            : outcomeState === "Deferred"
              ? "The opportunity may still be useful, but its delivery timing should be adjusted."
              : outcomeState === "Pending"
                ? "TwinMe is waiting for the user's confirmation before updating the learning model."
                : outcomeState === "Suppressed"
                  ? "The opportunity was not presented, so no direct user-response learning is available."
                  : "TwinMe is still monitoring the opportunity outcome.";

    const nextOutcomeAction = memoryEligible
      ? "Send the opportunity outcome to memory consolidation and personalization."
      : outcomeState === "Pending"
        ? "Wait for the user response."
        : outcomeState === "Suppressed"
          ? "Continue monitoring for improved presentation conditions."
          : "Continue collecting outcome evidence.";

    return {
      responseState,
      opportunityPresented,
      opportunityDeferred,
      opportunitySuppressed,
      positiveResponse,
      negativeResponse,
      pendingResponse,
      delayedResponse,
      outcomeAvailable,
      observedOutcome,
      outcomeQuality,
      usefulnessScore,
      outcomeState,
      learningImpact,
      memoryClassification,
      confidenceAdjustment,
      rankingAdjustment,
      timingAdjustment,
      memoryEligible,
      integrationMessage,
      nextOutcomeAction,
    };
  }, [
    opportunityResponseIntelligenceEngine,
    controlledOpportunityPresentationEngine,
    opportunityReadinessGateEngine,
    opportunityActionPlanningEngine,
    recommendationFeedback,
    postExecutionOutcomeEngine,
  ]);

  const longTermPersonalKnowledgeEngine = useMemo(() => {
    const memoryStrength = longTermMemory.memoryStrength;

    const retainedMemories = longTermMemory.retainedMemories;

    const successfulPatterns = recommendationFeedback.accepted;

    const unsuccessfulPatterns = recommendationFeedback.ignored;

    const consistency = routineIntelligence.consistency;

    const trustScore = relationshipIntelligence.trustScore;

    const learningConfidence = confidenceCalibrationEngine.calibratedConfidence;

    const knowledgeScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          memoryStrength * 0.2 +
            retainedMemories * 0.1 +
            recommendationFeedback.successRate * 0.2 +
            consistency * 0.15 +
            trustScore * 0.15 +
            learningConfidence * 0.2,
        ),
      ),
    );

    const maturityLevel =
      knowledgeScore >= 90
        ? "Expertly Personalized"
        : knowledgeScore >= 80
          ? "Highly Personalized"
          : knowledgeScore >= 65
            ? "Well Understood"
            : knowledgeScore >= 50
              ? "Learning User"
              : "Early Learning";

    const adaptationReadiness = knowledgeScore >= 75;

    const dominantLearningFocus =
      successfulPatterns >= unsuccessfulPatterns
        ? "Reinforce Successful Behaviors"
        : "Improve Recommendation Accuracy";

    const personalizationSummary = adaptationReadiness
      ? "TwinMe has accumulated enough long-term knowledge to confidently personalize future decisions."
      : "TwinMe continues collecting long-term observations before increasing personalization strength.";

    const nextKnowledgeGoal = adaptationReadiness
      ? "Expand long-term behavioral prediction."
      : "Continue collecting experiences and validating behavior patterns.";

    return {
      memoryStrength,
      retainedMemories,
      successfulPatterns,
      unsuccessfulPatterns,
      consistency,
      trustScore,
      learningConfidence,
      knowledgeScore,
      maturityLevel,
      adaptationReadiness,
      dominantLearningFocus,
      personalizationSummary,
      nextKnowledgeGoal,
    };
  }, [
    longTermMemory,
    recommendationFeedback,
    routineIntelligence,
    relationshipIntelligence,
    confidenceCalibrationEngine,
  ]);

  const personalEvolutionIdentityEngine = useMemo(() => {
    const knowledgeScore = longTermPersonalKnowledgeEngine.knowledgeScore;

    const personalizationScore =
      personalizedReasoningEngine.personalizationScore;

    const learningProgress = adaptiveDashboard.learningProgress;

    const outcomeUsefulness =
      opportunityOutcomeIntegrationEngine.usefulnessScore;

    const recommendationAccuracy = recommendationFeedback.successRate;

    const routineConsistency = longTermPersonalKnowledgeEngine.consistency;

    const relationshipTrust = longTermPersonalKnowledgeEngine.trustScore;

    const confidence = longTermPersonalKnowledgeEngine.learningConfidence;

    const evolutionScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          knowledgeScore * 0.25 +
            personalizationScore * 0.2 +
            learningProgress * 0.15 +
            outcomeUsefulness * 0.15 +
            recommendationAccuracy * 0.1 +
            routineConsistency * 0.05 +
            relationshipTrust * 0.05 +
            confidence * 0.05,
        ),
      ),
    );

    const identityMaturity =
      evolutionScore >= 90
        ? "Deeply Established"
        : evolutionScore >= 80
          ? "Highly Developed"
          : evolutionScore >= 65
            ? "Developing"
            : evolutionScore >= 50
              ? "Emerging"
              : "Early Formation";

    const evolutionDirection =
      opportunityOutcomeIntegrationEngine.rankingAdjustment > 0 &&
      opportunityOutcomeIntegrationEngine.confidenceAdjustment > 0
        ? "Strengthening"
        : opportunityOutcomeIntegrationEngine.rankingAdjustment < 0 ||
            opportunityOutcomeIntegrationEngine.confidenceAdjustment < 0
          ? "Recalibrating"
          : learningProgress >= knowledgeScore
            ? "Expanding"
            : "Stable";

    const preferenceStability =
      recommendationFeedback.accepted >= recommendationFeedback.ignored
        ? "Stable"
        : "Still Adapting";

    const behavioralConsistency =
      routineConsistency >= 80
        ? "Highly Consistent"
        : routineConsistency >= 60
          ? "Consistent"
          : routineConsistency >= 40
            ? "Variable"
            : "Limited Evidence";

    const trustDevelopment =
      relationshipTrust >= 85
        ? "Strong"
        : relationshipTrust >= 70
          ? "Established"
          : relationshipTrust >= 50
            ? "Developing"
            : "Early";

    const decisionIdentity = personalizedReasoningEngine.reasoningProfile;

    const communicationIdentity =
      personalizedReasoningEngine.recommendationStyle;

    const identitySignals = [
      {
        id: "knowledge",
        label: "Long-term knowledge",
        score: knowledgeScore,
        state: longTermPersonalKnowledgeEngine.maturityLevel,
      },
      {
        id: "preferences",
        label: "Preference stability",
        score: personalizationScore,
        state: preferenceStability,
      },
      {
        id: "behavior",
        label: "Behavioral consistency",
        score: routineConsistency,
        state: behavioralConsistency,
      },
      {
        id: "trust",
        label: "Relationship trust",
        score: relationshipTrust,
        state: trustDevelopment,
      },
      {
        id: "outcomes",
        label: "Outcome usefulness",
        score: outcomeUsefulness,
        state: opportunityOutcomeIntegrationEngine.outcomeState,
      },
      {
        id: "confidence",
        label: "Learning confidence",
        score: confidence,
        state:
          confidence >= 80
            ? "High"
            : confidence >= 60
              ? "Moderate"
              : "Developing",
      },
    ];

    const strongestIdentitySignal = identitySignals.reduce(
      (strongest, signal) =>
        signal.score > strongest.score ? signal : strongest,
      identitySignals[0],
    );

    const weakestIdentitySignal = identitySignals.reduce(
      (weakest, signal) => (signal.score < weakest.score ? signal : weakest),
      identitySignals[0],
    );

    const evolutionReadiness =
      evolutionScore >= 75 &&
      longTermPersonalKnowledgeEngine.adaptationReadiness;

    const identitySummary = evolutionReadiness
      ? `TwinMe has developed a ${identityMaturity.toLowerCase()} understanding of the user's evolving routines, preferences, trust patterns, and decision style.`
      : "TwinMe is still gathering enough long-term evidence to form a stable personal identity model.";

    const adaptationFocus =
      evolutionDirection === "Recalibrating"
        ? `Improve ${weakestIdentitySignal.label.toLowerCase()} before increasing personalization.`
        : `Continue strengthening ${strongestIdentitySignal.label.toLowerCase()} while monitoring for change.`;

    const nextEvolutionGoal = evolutionReadiness
      ? "Predict meaningful preference and behavior changes before they affect future decisions."
      : "Continue validating stable patterns across time, context, and outcomes.";

    return {
      knowledgeScore,
      personalizationScore,
      learningProgress,
      outcomeUsefulness,
      recommendationAccuracy,
      routineConsistency,
      relationshipTrust,
      confidence,
      evolutionScore,
      identityMaturity,
      evolutionDirection,
      preferenceStability,
      behavioralConsistency,
      trustDevelopment,
      decisionIdentity,
      communicationIdentity,
      identitySignals,
      strongestIdentitySignal,
      weakestIdentitySignal,
      evolutionReadiness,
      identitySummary,
      adaptationFocus,
      nextEvolutionGoal,
    };
  }, [
    longTermPersonalKnowledgeEngine,
    personalizedReasoningEngine,
    adaptiveDashboard,
    opportunityOutcomeIntegrationEngine,
    recommendationFeedback,
  ]);

  const futureSelfPredictionEngine = useMemo(() => {
    const identity = personalEvolutionIdentityEngine;

    const knowledgeStrength = longTermPersonalKnowledgeEngine.knowledgeScore;

    const adaptationStrength = personalizedReasoningEngine.personalizationScore;

    const learningMomentum = adaptiveDashboard.learningProgress;

    const opportunityMomentum =
      opportunityOutcomeIntegrationEngine.rankingAdjustment;

    const confidenceMomentum =
      opportunityOutcomeIntegrationEngine.confidenceAdjustment;

    const projectionScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          identity.evolutionScore * 0.3 +
            knowledgeStrength * 0.2 +
            adaptationStrength * 0.15 +
            learningMomentum * 0.15 +
            identity.recommendationAccuracy * 0.1 +
            identity.routineConsistency * 0.05 +
            identity.relationshipTrust * 0.05,
        ),
      ),
    );

    const projectionHorizon =
      projectionScore >= 85
        ? "Long Range"
        : projectionScore >= 70
          ? "Mid Range"
          : projectionScore >= 55
            ? "Near Term"
            : "Early Forecast";

    const projectedDirection =
      identity.evolutionDirection === "Strengthening"
        ? "More Confident & Personalized"
        : identity.evolutionDirection === "Recalibrating"
          ? "More Selective & Adaptive"
          : identity.evolutionDirection === "Expanding"
            ? "Broader & More Predictive"
            : "Stable & Consistent";

    const likelyPreferenceShift =
      identity.preferenceStability === "Stable"
        ? "Preferences are likely to deepen rather than change abruptly."
        : "Preferences may continue shifting as TwinMe gathers more evidence.";

    const likelyBehaviorShift =
      identity.behavioralConsistency === "Highly Consistent" ||
      identity.behavioralConsistency === "Consistent"
        ? "Future behavior is likely to remain predictable across familiar contexts."
        : "Future behavior may vary until stronger routine patterns emerge.";

    const likelyTrustShift =
      identity.trustDevelopment === "Strong" ||
      identity.trustDevelopment === "Established"
        ? "Trust in recommendations is likely to increase with continued successful outcomes."
        : "Trust growth will depend on more accurate and well-timed recommendations.";

    const futureDecisionStyle = identity.decisionIdentity;

    const futureCommunicationStyle = identity.communicationIdentity;

    const predictiveSignals = [
      {
        id: "identity",
        label: "Identity evolution",
        score: identity.evolutionScore,
        projection: projectedDirection,
      },
      {
        id: "preferences",
        label: "Preference maturity",
        score: identity.personalizationScore,
        projection: likelyPreferenceShift,
      },
      {
        id: "behavior",
        label: "Behavior stability",
        score: identity.routineConsistency,
        projection: likelyBehaviorShift,
      },
      {
        id: "trust",
        label: "Trust development",
        score: identity.relationshipTrust,
        projection: likelyTrustShift,
      },
      {
        id: "knowledge",
        label: "Knowledge depth",
        score: knowledgeStrength,
        projection:
          knowledgeStrength >= 75
            ? "TwinMe can increasingly rely on long-term context."
            : "TwinMe should continue validating long-term context.",
      },
    ];

    const strongestFutureSignal = predictiveSignals.reduce(
      (strongest, signal) =>
        signal.score > strongest.score ? signal : strongest,
      predictiveSignals[0],
    );

    const weakestFutureSignal = predictiveSignals.reduce(
      (weakest, signal) => (signal.score < weakest.score ? signal : weakest),
      predictiveSignals[0],
    );

    const futureReadiness =
      projectionScore >= 75 &&
      personalEvolutionIdentityEngine.evolutionReadiness;

    const forecastConfidence = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          identity.confidence * 0.35 +
            knowledgeStrength * 0.25 +
            identity.recommendationAccuracy * 0.2 +
            learningMomentum * 0.2,
        ),
      ),
    );

    const futureSelfSummary = futureReadiness
      ? `TwinMe predicts the user's future self will become ${projectedDirection.toLowerCase()}, with increasingly stable preferences and more context-aware decision support.`
      : "TwinMe is still collecting enough long-term evidence to make a confident future-self prediction.";

    const preparationFocus =
      identity.evolutionDirection === "Recalibrating"
        ? `Improve ${weakestFutureSignal.label.toLowerCase()} before increasing future prediction strength.`
        : `Prepare for growth in ${strongestFutureSignal.label.toLowerCase()} while continuing to monitor change.`;

    const nextPredictionGoal = futureReadiness
      ? "Anticipate meaningful preference, routine, and decision changes before the user explicitly expresses them."
      : "Continue validating identity, behavior, and outcome patterns across time.";

    return {
      knowledgeStrength,
      adaptationStrength,
      learningMomentum,
      opportunityMomentum,
      confidenceMomentum,
      projectionScore,
      projectionHorizon,
      projectedDirection,
      likelyPreferenceShift,
      likelyBehaviorShift,
      likelyTrustShift,
      futureDecisionStyle,
      futureCommunicationStyle,
      predictiveSignals,
      strongestFutureSignal,
      weakestFutureSignal,
      futureReadiness,
      forecastConfidence,
      futureSelfSummary,
      preparationFocus,
      nextPredictionGoal,
    };
  }, [
    personalEvolutionIdentityEngine,
    longTermPersonalKnowledgeEngine,
    personalizedReasoningEngine,
    adaptiveDashboard,
    opportunityOutcomeIntegrationEngine,
  ]);

  const futureAlignmentLifeDirectionEngine = useMemo(() => {
    const futureProjection = futureSelfPredictionEngine;

    const identity = personalEvolutionIdentityEngine;

    const longTermKnowledge = longTermPersonalKnowledgeEngine;

    const currentOpportunity = proactiveOpportunityEngine.topOpportunity;

    const opportunityValue = currentOpportunity?.opportunityScore ?? 0;

    const futureReadiness = futureProjection.futureReadiness;

    const adaptationReadiness = longTermKnowledge.adaptationReadiness;

    const safetyAlignment = safeExecutionReadinessEngine.readinessScore;

    const consentAlignment = userConsentControlEngine.consentScore;

    const permissionAlignment = permissionBoundaryEngine.boundaryScore;

    const outcomeAlignment =
      opportunityOutcomeIntegrationEngine.usefulnessScore;

    const alignmentScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          futureProjection.projectionScore * 0.2 +
            futureProjection.forecastConfidence * 0.15 +
            identity.evolutionScore * 0.15 +
            longTermKnowledge.knowledgeScore * 0.15 +
            outcomeAlignment * 0.1 +
            opportunityValue * 0.1 +
            safetyAlignment * 0.05 +
            consentAlignment * 0.05 +
            permissionAlignment * 0.05,
        ),
      ),
    );

    const alignmentState =
      alignmentScore >= 90
        ? "Strongly Aligned"
        : alignmentScore >= 75
          ? "Aligned"
          : alignmentScore >= 60
            ? "Partially Aligned"
            : alignmentScore >= 45
              ? "Uncertain"
              : "Needs Recalibration";

    const lifeDirection = futureProjection.projectedDirection;

    const momentumDirection =
      opportunityOutcomeIntegrationEngine.rankingAdjustment > 0 &&
      opportunityOutcomeIntegrationEngine.confidenceAdjustment > 0
        ? "Forward"
        : opportunityOutcomeIntegrationEngine.rankingAdjustment < 0 ||
            opportunityOutcomeIntegrationEngine.confidenceAdjustment < 0
          ? "Recalibrating"
          : identity.evolutionDirection === "Strengthening"
            ? "Forward"
            : identity.evolutionDirection === "Recalibrating"
              ? "Recalibrating"
              : "Stable";

    const alignmentReady =
      alignmentScore >= 75 && futureReadiness && adaptationReadiness;

    const alignmentSignals = [
      {
        id: "future",
        label: "Future projection",
        score: futureProjection.projectionScore,
        state: futureProjection.projectionHorizon,
      },
      {
        id: "identity",
        label: "Identity evolution",
        score: identity.evolutionScore,
        state: identity.identityMaturity,
      },
      {
        id: "knowledge",
        label: "Long-term knowledge",
        score: longTermKnowledge.knowledgeScore,
        state: longTermKnowledge.maturityLevel,
      },
      {
        id: "outcomes",
        label: "Outcome usefulness",
        score: outcomeAlignment,
        state: opportunityOutcomeIntegrationEngine.outcomeState,
      },
      {
        id: "safety",
        label: "Safety readiness",
        score: safetyAlignment,
        state: safeExecutionReadinessEngine.readinessState,
      },
      {
        id: "consent",
        label: "Consent alignment",
        score: consentAlignment,
        state: userConsentControlEngine.consentState,
      },
      {
        id: "permission",
        label: "Permission alignment",
        score: permissionAlignment,
        state: permissionBoundaryEngine.boundaryState,
      },
    ];

    const strongestAlignmentSignal = alignmentSignals.reduce(
      (strongest, signal) =>
        signal.score > strongest.score ? signal : strongest,
      alignmentSignals[0],
    );

    const weakestAlignmentSignal = alignmentSignals.reduce(
      (weakest, signal) => (signal.score < weakest.score ? signal : weakest),
      alignmentSignals[0],
    );

    const directionRisk =
      weakestAlignmentSignal.score < 45
        ? "High"
        : weakestAlignmentSignal.score < 65
          ? "Moderate"
          : "Low";

    const recommendedDirection = alignmentReady
      ? `Continue moving toward ${lifeDirection.toLowerCase()} while reinforcing ${strongestAlignmentSignal.label.toLowerCase()}.`
      : `Strengthen ${weakestAlignmentSignal.label.toLowerCase()} before increasing long-range personalization.`;

    const courseCorrection =
      momentumDirection === "Recalibrating"
        ? `Reduce prediction strength and reassess ${weakestAlignmentSignal.label.toLowerCase()}.`
        : alignmentState === "Needs Recalibration"
          ? "Return to validated routines, preferences, and successful outcomes before making stronger future recommendations."
          : "No major course correction is currently required.";

    const alignmentSummary = alignmentReady
      ? `TwinMe estimates that the user's current behavior and projected future are ${alignmentState.toLowerCase()}, with ${directionRisk.toLowerCase()} directional risk.`
      : "TwinMe is still validating whether current behavior, preferences, and opportunities support the projected future direction.";

    const nextAlignmentAction = alignmentReady
      ? "Use the aligned future direction to guide upcoming FYI Today priorities and proactive opportunities."
      : `Improve ${weakestAlignmentSignal.label.toLowerCase()} and reevaluate alignment.`;

    return {
      opportunityValue,
      futureReadiness,
      adaptationReadiness,
      safetyAlignment,
      consentAlignment,
      permissionAlignment,
      outcomeAlignment,
      alignmentScore,
      alignmentState,
      lifeDirection,
      momentumDirection,
      alignmentReady,
      alignmentSignals,
      strongestAlignmentSignal,
      weakestAlignmentSignal,
      directionRisk,
      recommendedDirection,
      courseCorrection,
      alignmentSummary,
      nextAlignmentAction,
    };
  }, [
    futureSelfPredictionEngine,
    personalEvolutionIdentityEngine,
    longTermPersonalKnowledgeEngine,
    proactiveOpportunityEngine,
    safeExecutionReadinessEngine,
    userConsentControlEngine,
    permissionBoundaryEngine,
    opportunityOutcomeIntegrationEngine,
  ]);

  const holisticLifeGuidanceOrchestrator = useMemo(() => {
    const alignment = futureAlignmentLifeDirectionEngine;

    const future = futureSelfPredictionEngine;

    const identity = personalEvolutionIdentityEngine;

    const knowledge = longTermPersonalKnowledgeEngine;

    const currentOpportunity = proactiveOpportunityEngine.topOpportunity;

    const opportunityAvailable = Boolean(currentOpportunity);

    const opportunityReady = opportunityReadinessGateEngine.opportunityReady;

    const guidancePermitted =
      permissionBoundaryEngine.executionAllowed &&
      !userConsentControlEngine.needsConfirmation;

    const deliveryPermitted = contextualFyiTimingEngine.notificationAllowed;

    const safetyReady =
      safeExecutionReadinessEngine.readinessScore >= 60 &&
      !liveExecutionMonitoringEngine.riskEscalated;

    const confidenceReady =
      confidenceCalibrationEngine.calibratedConfidence >= 60;

    const guidanceScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          alignment.alignmentScore * 0.2 +
            future.projectionScore * 0.15 +
            identity.evolutionScore * 0.15 +
            knowledge.knowledgeScore * 0.15 +
            personalizedReasoningEngine.personalizationScore * 0.1 +
            opportunityReadinessGateEngine.readinessScore * 0.1 +
            safeExecutionReadinessEngine.readinessScore * 0.05 +
            confidenceCalibrationEngine.calibratedConfidence * 0.05 +
            contextualFyiTimingEngine.timingScore * 0.05,
        ),
      ),
    );

    const guidanceDecision = !guidancePermitted
      ? userConsentControlEngine.needsConfirmation
        ? "Request Confirmation"
        : "Permission Hold"
      : !safetyReady
        ? "Safety Hold"
        : !confidenceReady
          ? "Confidence Hold"
          : opportunityAvailable && opportunityReady && deliveryPermitted
            ? "Guide Now"
            : opportunityAvailable
              ? "Guide Later"
              : alignment.alignmentReady
                ? "Maintain Direction"
                : "Observe";

    const guidanceState =
      guidanceDecision === "Guide Now" && guidanceScore >= 90
        ? "Fully Orchestrated"
        : guidanceDecision === "Guide Now"
          ? "Ready"
          : guidanceDecision === "Guide Later"
            ? "Queued"
            : guidanceDecision === "Maintain Direction"
              ? "Aligned"
              : guidanceDecision === "Request Confirmation"
                ? "Awaiting User"
                : guidanceDecision.includes("Hold")
                  ? "Held"
                  : "Monitoring";

    const guidancePriority =
      guidanceDecision === "Guide Now"
        ? opportunityActionPlanningEngine.actionPriority
        : alignment.directionRisk === "High"
          ? "High"
          : alignment.directionRisk === "Moderate"
            ? "Moderate"
            : "Low";

    const primaryGuidance =
      guidanceDecision === "Guide Now" && currentOpportunity
        ? opportunityActionPlanningEngine.suggestedAction
        : guidanceDecision === "Guide Later" && currentOpportunity
          ? `Preserve for later: ${currentOpportunity.title}`
          : guidanceDecision === "Maintain Direction"
            ? alignment.recommendedDirection
            : guidanceDecision === "Request Confirmation"
              ? "Ask the user before presenting or acting on the current guidance."
              : guidanceDecision === "Permission Hold"
                ? "Keep guidance visible without taking action."
                : guidanceDecision === "Safety Hold"
                  ? "Pause proactive guidance until safety readiness improves."
                  : guidanceDecision === "Confidence Hold"
                    ? "Continue gathering evidence before providing stronger guidance."
                    : alignment.nextAlignmentAction;

    const guidancePillars = [
      {
        id: "alignment",
        label: "Future alignment",
        score: alignment.alignmentScore,
        state: alignment.alignmentState,
        ready: alignment.alignmentReady,
      },
      {
        id: "future",
        label: "Future prediction",
        score: future.projectionScore,
        state: future.projectionHorizon,
        ready: future.futureReadiness,
      },
      {
        id: "identity",
        label: "Identity model",
        score: identity.evolutionScore,
        state: identity.identityMaturity,
        ready: identity.evolutionReadiness,
      },
      {
        id: "knowledge",
        label: "Personal knowledge",
        score: knowledge.knowledgeScore,
        state: knowledge.maturityLevel,
        ready: knowledge.adaptationReadiness,
      },
      {
        id: "opportunity",
        label: "Opportunity readiness",
        score: opportunityReadinessGateEngine.readinessScore,
        state: opportunityReadinessGateEngine.readinessState,
        ready: opportunityReady,
      },
      {
        id: "safety",
        label: "Safety readiness",
        score: safeExecutionReadinessEngine.readinessScore,
        state: safeExecutionReadinessEngine.readinessState,
        ready: safetyReady,
      },
      {
        id: "confidence",
        label: "Guidance confidence",
        score: confidenceCalibrationEngine.calibratedConfidence,
        state: confidenceReady ? "Ready" : "Developing",
        ready: confidenceReady,
      },
    ];

    const readyPillars = guidancePillars.filter(
      (pillar) => pillar.ready,
    ).length;

    const heldPillars = guidancePillars.length - readyPillars;

    const strongestGuidancePillar = guidancePillars.reduce(
      (strongest, pillar) =>
        pillar.score > strongest.score ? pillar : strongest,
      guidancePillars[0],
    );

    const weakestGuidancePillar = guidancePillars.reduce(
      (weakest, pillar) => (pillar.score < weakest.score ? pillar : weakest),
      guidancePillars[0],
    );

    const userControlState = userConsentControlEngine.needsConfirmation
      ? "Confirmation Required"
      : permissionBoundaryEngine.executionAllowed
        ? "User Controlled"
        : "Restricted";

    const orchestrationMessage =
      guidanceDecision === "Guide Now"
        ? "TwinMe has combined the user's current context, long-term identity, future direction, opportunity readiness, safety, and consent into a controlled guidance recommendation."
        : guidanceDecision === "Guide Later"
          ? "The guidance remains relevant, but timing or readiness conditions suggest presenting it later."
          : guidanceDecision === "Maintain Direction"
            ? "No immediate intervention is needed; TwinMe recommends maintaining the currently aligned direction."
            : guidanceDecision === "Request Confirmation"
              ? "TwinMe has prepared guidance but will not proceed without explicit user confirmation."
              : guidanceDecision.includes("Hold")
                ? `Guidance is being held while TwinMe improves ${weakestGuidancePillar.label.toLowerCase()}.`
                : "TwinMe is continuing to observe the user's direction before providing stronger guidance.";

    const nextGuidanceAction =
      guidanceDecision === "Guide Now"
        ? "Present the guidance through FYI Today and record the user's response."
        : guidanceDecision === "Guide Later"
          ? "Return the guidance to the contextual timing engine."
          : guidanceDecision === "Request Confirmation"
            ? "Request explicit user confirmation."
            : guidanceDecision === "Maintain Direction"
              ? "Continue monitoring alignment and reinforce successful patterns."
              : `Improve ${weakestGuidancePillar.label.toLowerCase()} and reevaluate guidance readiness.`;

    return {
      opportunityAvailable,
      opportunityReady,
      guidancePermitted,
      deliveryPermitted,
      safetyReady,
      confidenceReady,
      guidanceScore,
      guidanceDecision,
      guidanceState,
      guidancePriority,
      primaryGuidance,
      guidancePillars,
      readyPillars,
      heldPillars,
      strongestGuidancePillar,
      weakestGuidancePillar,
      userControlState,
      orchestrationMessage,
      nextGuidanceAction,
    };
  }, [
    futureAlignmentLifeDirectionEngine,
    futureSelfPredictionEngine,
    personalEvolutionIdentityEngine,
    longTermPersonalKnowledgeEngine,
    proactiveOpportunityEngine,
    opportunityReadinessGateEngine,
    permissionBoundaryEngine,
    userConsentControlEngine,
    contextualFyiTimingEngine,
    safeExecutionReadinessEngine,
    liveExecutionMonitoringEngine,
    confidenceCalibrationEngine,
    personalizedReasoningEngine,
    opportunityActionPlanningEngine,
  ]);

  const twinMeLaunchReadinessEngine = useMemo(() => {
    const guidance = holisticLifeGuidanceOrchestrator;

    const alignment = futureAlignmentLifeDirectionEngine;

    const future = futureSelfPredictionEngine;

    const identity = personalEvolutionIdentityEngine;

    const knowledge = longTermPersonalKnowledgeEngine;

    const intelligenceChecks = [
      {
        id: "guidance",
        label: "Holistic guidance",
        score: guidance.guidanceScore,
        state: guidance.guidanceState,
        passed: guidance.guidanceScore >= 60,
      },
      {
        id: "alignment",
        label: "Future alignment",
        score: alignment.alignmentScore,
        state: alignment.alignmentState,
        passed: alignment.alignmentScore >= 60,
      },
      {
        id: "future",
        label: "Future prediction",
        score: future.projectionScore,
        state: future.projectionHorizon,
        passed: future.projectionScore >= 60,
      },
      {
        id: "identity",
        label: "Personal identity",
        score: identity.evolutionScore,
        state: identity.identityMaturity,
        passed: identity.evolutionScore >= 60,
      },
      {
        id: "knowledge",
        label: "Long-term knowledge",
        score: knowledge.knowledgeScore,
        state: knowledge.maturityLevel,
        passed: knowledge.knowledgeScore >= 60,
      },
      {
        id: "personalization",
        label: "Personalized reasoning",
        score: personalizedReasoningEngine.personalizationScore,
        state: personalizedReasoningEngine.reasoningProfile,
        passed: personalizedReasoningEngine.personalizationScore >= 60,
      },
      {
        id: "memory",
        label: "Experience memory",
        score: longTermMemory.memoryStrength,
        state: longTermMemory.memoryState,
        passed: longTermMemory.memoryStrength >= 50,
      },
      {
        id: "confidence",
        label: "Confidence calibration",
        score: confidenceCalibrationEngine.calibratedConfidence,
        state:
          confidenceCalibrationEngine.calibratedConfidence >= 75
            ? "Strong"
            : confidenceCalibrationEngine.calibratedConfidence >= 60
              ? "Ready"
              : "Developing",
        passed: confidenceCalibrationEngine.calibratedConfidence >= 60,
      },
      {
        id: "safety",
        label: "Safe execution",
        score: safeExecutionReadinessEngine.readinessScore,
        state: safeExecutionReadinessEngine.readinessState,
        passed:
          safeExecutionReadinessEngine.readinessScore >= 60 &&
          !liveExecutionMonitoringEngine.riskEscalated,
      },
      {
        id: "consent",
        label: "User consent",
        score: userConsentControlEngine.consentScore,
        state: userConsentControlEngine.consentState,
        passed: userConsentControlEngine.consentScore >= 60,
      },
      {
        id: "permission",
        label: "Permission boundaries",
        score: permissionBoundaryEngine.boundaryScore,
        state: permissionBoundaryEngine.boundaryState,
        passed: permissionBoundaryEngine.boundaryScore >= 60,
      },
      {
        id: "explainability",
        label: "Decision explainability",
        score: decisionAuditEngine.auditScore,
        state: decisionAuditEngine.explainabilityState,
        passed: decisionAuditEngine.auditScore >= 60,
      },
      {
        id: "execution",
        label: "Controlled execution",
        score: executionSimulationEngine.successProbability,
        state:
          executionSimulationEngine.successProbability >= 75
            ? "Ready"
            : executionSimulationEngine.successProbability >= 60
              ? "Conditional"
              : "Developing",
        passed: executionSimulationEngine.successProbability >= 60,
      },
      {
        id: "learning",
        label: "Adaptive learning",
        score: adaptiveDashboard.learningProgress,
        state: adaptiveDashboard.adaptationLevel,
        passed: adaptiveDashboard.learningProgress >= 50,
      },
      {
        id: "fyi",
        label: "FYI Today intelligence",
        score: contextualFyiTimingEngine.timingScore,
        state: contextualFyiTimingEngine.notificationAllowed
          ? "Delivery Ready"
          : "Context Controlled",
        passed: contextualFyiTimingEngine.timingScore >= 50,
      },
    ];

    const passedChecks = intelligenceChecks.filter(
      (check) => check.passed,
    ).length;

    const heldChecks = intelligenceChecks.length - passedChecks;

    const completionPercentage = Math.round(
      (passedChecks / intelligenceChecks.length) * 100,
    );

    const launchScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          guidance.guidanceScore * 0.15 +
            alignment.alignmentScore * 0.1 +
            future.projectionScore * 0.08 +
            identity.evolutionScore * 0.08 +
            knowledge.knowledgeScore * 0.08 +
            personalizedReasoningEngine.personalizationScore * 0.08 +
            confidenceCalibrationEngine.calibratedConfidence * 0.08 +
            safeExecutionReadinessEngine.readinessScore * 0.1 +
            userConsentControlEngine.consentScore * 0.07 +
            permissionBoundaryEngine.boundaryScore * 0.07 +
            executionSimulationEngine.successProbability * 0.06 +
            adaptiveDashboard.learningProgress * 0.05,
        ),
      ),
    );

    const criticalSystemsPassed =
      safeExecutionReadinessEngine.readinessScore >= 60 &&
      userConsentControlEngine.consentScore >= 60 &&
      permissionBoundaryEngine.boundaryScore >= 60 &&
      confidenceCalibrationEngine.calibratedConfidence >= 60 &&
      !liveExecutionMonitoringEngine.riskEscalated;

    const launchReady =
      criticalSystemsPassed &&
      launchScore >= 70 &&
      passedChecks >= Math.ceil(intelligenceChecks.length * 0.75);

    const readinessState =
      launchReady && launchScore >= 90
        ? "Launch Certified"
        : launchReady
          ? "Launch Ready"
          : criticalSystemsPassed
            ? "Final Validation"
            : "Launch Held";

    const strongestSystem = intelligenceChecks.reduce(
      (strongest, check) => (check.score > strongest.score ? check : strongest),
      intelligenceChecks[0],
    );

    const weakestSystem = intelligenceChecks.reduce(
      (weakest, check) => (check.score < weakest.score ? check : weakest),
      intelligenceChecks[0],
    );

    const blockingSystems = intelligenceChecks
      .filter((check) => !check.passed)
      .map((check) => check.label);

    const certificationDecision = launchReady
      ? "Certified"
      : criticalSystemsPassed
        ? "Conditional"
        : "Held";

    const systemSummary = launchReady
      ? `TwinMe has passed ${passedChecks} of ${intelligenceChecks.length} readiness checks and completed the integrated intelligence roadmap.`
      : `TwinMe passed ${passedChecks} of ${intelligenceChecks.length} readiness checks. Final validation remains required before launch certification.`;

    const launchRecommendation = launchReady
      ? "Proceed to final production testing, security review, database validation, accessibility testing, and controlled beta deployment."
      : blockingSystems.length > 0
        ? `Resolve or validate: ${blockingSystems.join(", ")}.`
        : "Continue final system validation.";

    const nextLaunchAction = launchReady
      ? "Create the production launch checklist and begin end-to-end beta testing."
      : `Improve ${weakestSystem.label.toLowerCase()} and rerun launch readiness validation.`;

    return {
      intelligenceChecks,
      passedChecks,
      heldChecks,
      completionPercentage,
      launchScore,
      criticalSystemsPassed,
      launchReady,
      readinessState,
      strongestSystem,
      weakestSystem,
      blockingSystems,
      certificationDecision,
      systemSummary,
      launchRecommendation,
      nextLaunchAction,
    };
  }, [
    holisticLifeGuidanceOrchestrator,
    futureAlignmentLifeDirectionEngine,
    futureSelfPredictionEngine,
    personalEvolutionIdentityEngine,
    longTermPersonalKnowledgeEngine,
    personalizedReasoningEngine,
    longTermMemory,
    confidenceCalibrationEngine,
    safeExecutionReadinessEngine,
    liveExecutionMonitoringEngine,
    userConsentControlEngine,
    permissionBoundaryEngine,
    decisionAuditEngine,
    executionSimulationEngine,
    adaptiveDashboard,
    contextualFyiTimingEngine,
  ]);

  const regroupPlan = useMemo(() => {
    const locatedMembers = filteredRows.filter(
      (row) =>
        typeof row.latitude === "number" &&
        Number.isFinite(row.latitude) &&
        typeof row.longitude === "number" &&
        Number.isFinite(row.longitude),
    );

    if (locatedMembers.length === 0) {
      return {
        available: false,
        urgency: "Waiting",
        targetLabel: "Location signals needed",
        furthestMemberName: "Unknown",
        furthestDistanceKm: 0,
        midpointLatitude: null as number | null,
        midpointLongitude: null as number | null,
        recommendation:
          "Ask crew members to share location before TwinMe calculates a regroup point.",
      };
    }

    const midpointLatitude =
      locatedMembers.reduce(
        (sum, member) => sum + (member.latitude as number),
        0,
      ) / locatedMembers.length;

    const midpointLongitude =
      locatedMembers.reduce(
        (sum, member) => sum + (member.longitude as number),
        0,
      ) / locatedMembers.length;

    const membersWithMidpointDistance = locatedMembers.map((member) => ({
      member,
      distanceKm: calculateDistanceKm(
        midpointLatitude,
        midpointLongitude,
        member.latitude as number,
        member.longitude as number,
      ),
    }));

    const furthest = membersWithMidpointDistance.reduce(
      (current, candidate) =>
        candidate.distanceKm > current.distanceKm ? candidate : current,
      membersWithMidpointDistance[0],
    );

    const urgency =
      crewStats.flagged > 0 || desyncMetrics.fragmented
        ? "Immediate"
        : desyncMetrics.drifting
          ? "Recommended"
          : "Low";

    const recommendation =
      crewStats.flagged > 0
        ? `Contact ${furthest.member.name || "the affected crew member"} immediately and confirm their location before regrouping.`
        : desyncMetrics.fragmented
          ? `Regroup near the crew midpoint. ${
              furthest.member.name || "One member"
            } is approximately ${furthest.distanceKm.toFixed(
              1,
            )} km from the midpoint.`
          : desyncMetrics.drifting
            ? `Use the crew midpoint as a temporary regroup target and request fresh check-ins from stale members.`
            : `The crew is synchronized. Keep the midpoint available as a fallback regroup point.`;

    return {
      available: true,
      urgency,
      targetLabel: "Crew midpoint",
      furthestMemberName: furthest.member.name || "Crew Member",
      furthestDistanceKm: furthest.distanceKm,
      midpointLatitude,
      midpointLongitude,
      recommendation,
    };
  }, [
    filteredRows,
    crewStats.flagged,
    desyncMetrics.fragmented,
    desyncMetrics.drifting,
  ]);

  const crewTimeline = useMemo(() => {
    const memberNameByUserId = new Map(
      displayRows
        .filter((row) => row.user_id)
        .map((row) => [row.user_id as string, row.name || "Crew Member"]),
    );

    return crewCheckins.slice(0, 8).map((checkin) => {
      const minutesAgo = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(checkin.created_at).getTime()) / 60000,
        ),
      );

      const normalizedStatus = (checkin.status || "").toLowerCase();

      const event = normalizedStatus.includes("help")
        ? "Requested Help"
        : normalizedStatus.includes("heading home")
          ? "Started Heading Home"
          : normalizedStatus.includes("arrived")
            ? "Arrived Safely"
            : normalizedStatus.includes("active")
              ? "Checked In"
              : checkin.vibe_label || "Updated Status";

      return {
        id: checkin.id,
        member: memberNameByUserId.get(checkin.user_id) || "Crew Member",
        event,
        minutesAgo,
        status: normalizedStatus,
      };
    });
  }, [crewCheckins, displayRows]);

  // TWINCORE_CREW_PRESENCE_TRUTH_R16_8
  // Crew Presence Field is a non-geographic presentation surface.
  //
  // Visual node placement represents presence/status layout only.
  // It MUST NOT be interpreted as latitude, longitude, distance,
  // direction, or precise physical location.
  //
  // Real Crew latitude/longitude remain authoritative for geographic
  // intelligence such as distance, midpoint and regroup reasoning.
  const radarRows = filteredRows.slice(0, 6);

  async function handleCrewAction(
    action: "check-in" | "heading-home" | "need-help",
  ) {
    const now = new Date().toISOString();

    setCrewRows((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: "self-local",
            name: privacy.displayName || "Me",
            status:
              action === "check-in"
                ? "active"
                : action === "heading-home"
                  ? "heading home"
                  : "help",
            heartbeat_bpm: null,
            vibe_label:
              action === "check-in"
                ? "Checked In"
                : action === "heading-home"
                  ? "Heading Home"
                  : "Needs Help",
            location_name: "Current Layer",
            updated_at: now,
            latitude: null,
            longitude: null,
          },
        ];
      }

      return prev.map((row, index) =>
        index === 0
          ? {
              ...row,
              status:
                action === "check-in"
                  ? "active"
                  : action === "heading-home"
                    ? "heading home"
                    : "help",
              vibe_label:
                action === "check-in"
                  ? "Checked In"
                  : action === "heading-home"
                    ? "Heading Home"
                    : "Needs Help",
              updated_at: now,
            }
          : row,
      );
    });

    const message =
      action === "check-in"
        ? "Check-in sent"
        : action === "heading-home"
          ? "Heading home signal sent"
          : "Help signal activated";

    const status =
      action === "check-in"
        ? "active"
        : action === "heading-home"
          ? "heading home"
          : "help";

    const vibe =
      action === "check-in"
        ? "Checked In"
        : action === "heading-home"
          ? "Heading Home"
          : "Needs Help";

    setCrewMessage(message);


    await pushCrewSignal(status, vibe);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const activeCrew = await getActiveCrew(user.id);

    if (!activeCrew) {
      console.error("CREW CHECK-IN ERROR: No active crew found.");
      return;
    }

    const currentMember = crewRows.find(
      (row) => row.user_id === user.id || row.id === user.id,
    );

    const { error: checkinError } = await supabase
      .from("crew_checkins")
      .insert({
        crew_id: activeCrew.id,
        user_id: user.id,
        status,
        vibe_label: vibe,
        location_name: currentMember?.location_name || "Current Layer",
        latitude: currentMember?.latitude ?? null,
        longitude: currentMember?.longitude ?? null,
      });

    if (checkinError) {
      console.error("CREW CHECK-IN HISTORY ERROR:", checkinError);
      setCrewMessage(`${message}, but history could not be saved.`);
      return;
    }

    const memoryType =
      action === "check-in"
        ? "checkin"
        : action === "heading-home"
          ? "routine"
          : "recommendation";

    const memoryTitle =
      action === "check-in"
        ? "Crew check-in recorded"
        : action === "heading-home"
          ? "Heading-home pattern recorded"
          : "Help request recorded";

    const memorySummary =
      action === "check-in"
        ? `${privacy.displayName || "Crew Member"} checked in with the crew.`
        : action === "heading-home"
          ? `${privacy.displayName || "Crew Member"} began heading home.`
          : `${privacy.displayName || "Crew Member"} requested help from the crew.`;

    const memoryConfidence =
      action === "need-help" ? 95 : action === "heading-home" ? 80 : 70;

    const { error: memoryError } = await supabase
      .from("twinme_memories")
      .insert({
        user_id: user.id,
        crew_id: activeCrew.id,
        memory_type: memoryType,
        title: memoryTitle,
        summary: memorySummary,
        confidence: memoryConfidence,
        metadata: {
          action,
          status,
          vibe_label: vibe,
          location_name: currentMember?.location_name || "Current Layer",
          latitude: currentMember?.latitude ?? null,
          longitude: currentMember?.longitude ?? null,
          source: "crew_checkin",
        },
      });

    if (memoryError) {
      console.error("TWINME MEMORY WRITE ERROR:", memoryError);
    }

    void loadCrewCheckins();
  }

  return (
    <AuthGuard>
      <main className="min-h-screen overflow-hidden bg-[#06070a] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.08),transparent_34%)]" />
          <div className="absolute left-1/2 top-16 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl animate-orb-drift" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:26px_26px]" />
        </div>

        <div className="twincore-crew-content relative mx-auto w-full max-w-6xl px-4 pt-7 pb-80 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <TwinHero
              eyebrow="TwinCore • Crew"
              tone={crewStats.flagged > 0 ? "red" : "cyan"}
              title={
                crewStats.flagged > 0
                  ? "Your crew needs attention."
                  : crewStats.total > 0
                    ? "Your crew looks steady."
                    : "Your crew is ready."
              }
              subtitle={
                crewStats.flagged > 0
                  ? twinMeRecommendation
                  : crewStats.total > 0
                    ? "TwinMe is watching connection, movement, and crew drift."
                    : "Connect trusted people to activate your live crew layer."
              }
              body={
                crewStats.total > 0
                  ? `${crewMessage}. Trusted-only visibility is ${
                      privacy.trustedOnly ? "active" : "off"
                    } on this device.`
                  : "Crew, Party Mode, Spots, and TwinMe become stronger when trusted people are connected."
              }
              orb={
                <TwinOrb
                  state={
                    crewStats.flagged > 0
                      ? "warning"
                      : threatAssessment.level === "High"
                        ? "guardian"
                        : "idle"
                  }
                  size="xl"
                  pulse
                  rotate
                  glow
                  showRings
                  showParticles={crewStats.flagged > 0}
                />
              }
              badges={[
                {
                  label: "Pulse Connected",
                  tone: "cyan",
                  icon: <HeartPulse className="h-3 w-3" />,
                },
                {
                  label: "Trusted Layer",
                  tone: "emerald",
                  icon: <ShieldCheck className="h-3 w-3" />,
                },
                {
                  label:
                    crewStats.flagged > 0 ? "Attention Required" : "Crew Sync",
                  tone: crewStats.flagged > 0 ? "red" : "fuchsia",
                  icon:
                    crewStats.flagged > 0 ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    ),
                },
              ]}
              metrics={[
                {
                  label: "Pulse",
                  value: radarRows.length,
                  tone: "cyan",
                },
                {
                  label: "Connected",
                  value: crewStats.total,
                  tone: "fuchsia",
                },
                {
                  label: "Home",
                  value: crewStats.headingHome,
                  tone: "emerald",
                },
                {
                  label: "Alerts",
                  value: crewStats.flagged,
                  tone: crewStats.flagged > 0 ? "red" : "neutral",
                },
              ]}
              primaryAction={
                crewStats.flagged > 0 ? (
                  <a
                    href="#crew-threat-intelligence"
                    className="flex min-h-12 items-center justify-center rounded-[1.35rem] border border-red-300/25 bg-red-400/10 px-5 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/15"
                  >
                    Review Active Alert
                  </a>
                ) : crewStats.total > 0 ? (
                  <a
                    href="#crew-radar"
                    className="flex min-h-12 items-center justify-center rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
                  >
                    Open Presence Field
                  </a>
                ) : (
                  <Link
                    href="/join"
                    className="flex min-h-12 items-center justify-center rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
                  >
                    Invite Crew
                  </Link>
                )
              }
              secondaryAction={
                crewStats.total > 0 ? (
                  <Link
                    href="/join"
                    className="flex min-h-12 items-center justify-center rounded-[1.35rem] border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/[0.05]"
                  >
                    + Invite Crew
                  </Link>
                ) : undefined
              }
            />

            <TwinSection
              title="Crew Setup"
              subtitle="Crew ownership, membership and invite details"
              tone="neutral"
              defaultOpen={false}
            >
              <CrewIdentityCard
                userId={currentUserId}
                displayName={privacy.displayName}
              />
            </TwinSection>

            {/* TWINCORE_CREW_OS_SUMMARY */}
            <div className="mx-auto mb-5 max-w-6xl space-y-3">
              <TwinSituation
                eyebrow="Crew right now"
                tone={
                  threatAssessment.level === "Critical"
                    ? "red"
                    : threatAssessment.level === "High"
                      ? "amber"
                      : crewStats.flagged > 0
                        ? "amber"
                        : "cyan"
                }
                title={
                  crewStats.flagged > 0
                    ? `${crewStats.flagged} crew member${
                        crewStats.flagged === 1 ? "" : "s"
                      } need${crewStats.flagged === 1 ? "s" : ""} attention.`
                    : crewStats.total > 0
                      ? "Your crew is connected."
                      : "Your crew is ready to grow."
                }
                body={
                  crewStats.flagged > 0
                    ? `${twinMeRecommendation} Threat score ${threatAssessment.threatScore}.`
                    : `${crewStats.total} connected • ${radarRows.length} visible • ${crewStats.headingHome} heading home`
                }
                badge={
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                      threatAssessment.level === "Critical"
                        ? "border-red-300/30 bg-red-400/10 text-red-100"
                        : threatAssessment.level === "High"
                          ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                          : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                    }`}
                  >
                    {threatAssessment.level}
                  </span>
                }
                footer={
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-black text-white">
                        {crewStats.total}
                      </div>
                      <div className="text-[8px] uppercase tracking-wide text-white/35">
                        Crew
                      </div>
                    </div>

                    <div>
                      <div className="text-lg font-black text-cyan-100">
                        {radarRows.length}
                      </div>
                      <div className="text-[8px] uppercase tracking-wide text-white/35">
                        Visible
                      </div>
                    </div>

                    <div>
                      <div className="text-lg font-black text-emerald-100">
                        {crewStats.headingHome}
                      </div>
                      <div className="text-[8px] uppercase tracking-wide text-white/35">
                        Home
                      </div>
                    </div>

                    <div>
                      <div
                        className={`text-lg font-black ${
                          crewStats.flagged > 0 ? "text-red-200" : "text-white"
                        }`}
                      >
                        {crewStats.flagged}
                      </div>
                      <div className="text-[8px] uppercase tracking-wide text-white/35">
                        Alerts
                      </div>
                    </div>
                  </div>
                }
              />

              <TwinPrimaryAction
                tone={crewStats.flagged > 0 ? "red" : "cyan"}
                eyebrow={
                  crewStats.flagged > 0 ? "TwinMe recommends" : "Next step"
                }
                label={
                  crewStats.flagged > 0
                    ? "Review the active crew alert"
                    : crewStats.total > 0
                      ? "Open the crew presence field"
                      : "Invite your first crew member"
                }
                description={
                  crewStats.flagged > 0
                    ? "Open predictive threat intelligence and review the recommended intervention."
                    : crewStats.total > 0
                      ? "See live crew awareness, movement signals and status."
                      : "Build your trusted crew layer."
                }
                href={
                  crewStats.flagged > 0
                    ? "/crew#crew-threat-intelligence"
                    : crewStats.total > 0
                      ? "/crew#crew-radar"
                      : "/join"
                }
              />
            </div>

            {/* TWINCORE_CREW_OS_DETAILS */}
            <div className="mx-auto mb-3 mt-2 flex max-w-6xl items-center justify-between px-1">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30">
                  Crew details
                </div>
                <div className="mt-1 text-xs text-white/40">
                  Open only what you need.
                </div>
              </div>

              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/40">
                TwinMe OS
              </div>
            </div>

            <div id="crew-radar" className="scroll-mt-6">
              <TwinSection
                title="Live Crew"
                subtitle="Live crew awareness, movement signals and status"
                tone="cyan"
                defaultOpen={true}
              >
                <TwinPresenceMap
                  title="Where Everyone Is"
                  subtitle="Live spatial awareness across your trusted crew."
                  centerLabel="TwinMe"
                  centerMeta={
                    crewStats.flagged > 0 ? "Attention active" : "Crew core"
                  }
                  nodes={radarRows.map((row, index) => {
                    const tone = getRowTone(row);

                    const position = getMockRadarPosition(
                      row.user_id || row.id || String(index),
                      index,
                      radarRows.length,
                    );

                    const presenceTone =
                      tone === "red"
                        ? "distress"
                        : tone === "cyan"
                          ? "home"
                          : tone === "orange"
                            ? "away"
                            : "active";

                    const statusLabel =
                      tone === "red"
                        ? "Needs attention"
                        : tone === "cyan"
                          ? "Heading home"
                          : tone === "orange"
                            ? "Away"
                            : row.status || "Active";

                    return {
                      id: row.user_id || row.id || `presence-${index}`,
                      name: row.name || `Crew ${index + 1}`,
                      status: statusLabel,
                      tone: presenceTone,
                      x: Math.min(88, Math.max(12, position.x)),
                      y: Math.min(82, Math.max(18, 100 - position.y)),
                      meta:
                        row.location_name && row.location_name !== "Unknown"
                          ? row.location_name
                          : undefined,
                    };
                  })}
                  footer={
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                            Presence
                          </div>

                          <div className="mt-1 text-sm font-black text-white">
                            {radarRows.length} visible
                          </div>
                        </div>

                        <div className="h-8 w-px bg-white/[0.06]" />

                        <div>
                          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                            Alerts
                          </div>

                          <div
                            className={[
                              "mt-1 text-sm font-black",
                              crewStats.flagged > 0
                                ? "text-red-200"
                                : "text-emerald-200",
                            ].join(" ")}
                          >
                            {crewStats.flagged}
                          </div>
                        </div>

                        <div className="h-8 w-px bg-white/[0.06]" />

                        <div>
                          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                            Intelligence
                          </div>

                          <div className="mt-1 text-sm font-black text-cyan-100">
                            Lv. {Math.min(10, Math.max(1, crewStats.total + 1))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCrewAction("heading-home")}
                          className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-[10px] font-black text-cyan-100 transition hover:bg-cyan-300/10 active:scale-[0.98]"
                        >
                          Heading Home
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCrewAction("need-help")}
                          className="rounded-xl border border-red-300/20 bg-red-400/[0.07] px-3 py-2 text-[10px] font-black text-red-100 transition hover:bg-red-400/12 active:scale-[0.98]"
                        >
                          Need Help
                        </button>
                      </div>
                    </div>
                  }
                />
              </TwinSection>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "active", "heading-home"] as FilterMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilter(mode)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold backdrop-blur-xl transition duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                      filter === mode
                        ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                        : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]"
                    }`}
                  >
                    {mode === "all"
                      ? "All"
                      : mode === "active"
                        ? "Active"
                        : "Heading Home"}
                  </button>
                ),
              )}
            </div>
            <div id="crew-cohesion" className="scroll-mt-6">
              <TwinSection
                title="Crew Read"
                subtitle="Energy, synchronization and crew drift"
                tone="fuchsia"
                defaultOpen={false}
              >
                <AnimatedCard className="rounded-3xl border border-cyan-300/20 bg-[linear-gradient(180deg,#0f172a,#080b12)] p-5 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-md">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                          <Brain className="h-4 w-4" />
                          TwinMe Crew Cohesion
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                            desyncMetrics.fragmented
                              ? "border-red-300/30 bg-red-400/10 text-red-200"
                              : desyncMetrics.drifting
                                ? "border-orange-300/30 bg-orange-400/10 text-orange-200"
                                : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          }`}
                        >
                          {desyncMetrics.fragmented
                            ? "Fragmented"
                            : desyncMetrics.drifting
                              ? "Drifting"
                              : "Synchronized"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-white/55">
                        Adaptive read on crew energy, drift, and attention
                        signals
                      </p>

                      <p className="mt-3 text-sm leading-6 text-white/70">
                        {twinMeRecommendation}
                      </p>
                    </div>

                    <div className="relative mx-auto flex h-28 w-28 items-center justify-center sm:mx-0 sm:h-32 sm:w-32">
                      <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />

                      <div className="absolute inset-2 rounded-full border border-cyan-300/20 animate-[spin_30s_linear_infinite]" />

                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-fuchsia-400/10 via-cyan-300/20 to-emerald-300/10 blur-md" />

                      <div className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full border border-cyan-300/20 bg-black/70 backdrop-blur-xl">
                        <div className="text-2xl font-black text-white">
                          {cohesionScore}%
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                          Cohesion
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-emerald-300 transition-all duration-1000 ease-out"
                      style={{ width: `${cohesionScore}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-center text-xs sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-white/45">Energy</div>
                      <div className="mt-1 font-bold text-cyan-100">
                        {crewStats.total > 0 ? "Connected" : "Dormant"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-white/45">Drift Risk</div>
                      <div
                        className={`mt-1 font-bold ${
                          desyncMetrics.fragmented
                            ? "text-red-200"
                            : desyncMetrics.drifting
                              ? "text-orange-200"
                              : "text-emerald-100"
                        }`}
                      >
                        {desyncMetrics.fragmented
                          ? "High"
                          : desyncMetrics.drifting
                            ? "Medium"
                            : "Low"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-white/45">Desync Signals</div>
                      <div className="mt-1 font-bold text-fuchsia-100">
                        {desyncMetrics.staleMemberCount +
                          desyncMetrics.missingLocationCount +
                          crewStats.flagged}
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            <div id="crew-threat-intelligence" className="scroll-mt-6">
              <TwinSection
                title="Attention"
                subtitle="Predictive crew safety and intervention intelligence"
                tone="red"
                defaultOpen={
                  crewStats.flagged > 0 || threatAssessment.level === "Critical"
                }
              >
                <AnimatedCard
                  className={`mb-4 rounded-3xl border p-5 shadow-[0_0_40px_rgba(217,70,239,0.12)] ${
                    threatAssessment.level === "Critical"
                      ? "border-red-300/30 bg-red-500/[0.07]"
                      : threatAssessment.level === "High"
                        ? "border-orange-300/25 bg-orange-400/[0.06]"
                        : threatAssessment.level === "Elevated"
                          ? "border-fuchsia-300/20 bg-fuchsia-400/[0.05]"
                          : "border-emerald-300/20 bg-emerald-400/[0.04]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">
                        TwinMe Threat Intelligence
                      </div>

                      <h2 className="mt-2 text-lg font-black text-white">
                        Predictive Threat Assessment
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                          threatAssessment.level === "Critical"
                            ? "border-red-300/35 bg-red-400/15 text-red-100"
                            : threatAssessment.level === "High"
                              ? "border-orange-300/35 bg-orange-400/15 text-orange-100"
                              : threatAssessment.level === "Elevated"
                                ? "border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100"
                                : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                        }`}
                      >
                        {threatAssessment.level}
                      </span>

                      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-white/10 bg-black/40">
                        <div className="text-xl font-black text-white">
                          {threatAssessment.threatScore}
                        </div>
                        <div className="text-[8px] font-bold uppercase tracking-wide text-white/45">
                          Threat
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        threatAssessment.level === "Critical"
                          ? "bg-red-400"
                          : threatAssessment.level === "High"
                            ? "bg-orange-400"
                            : threatAssessment.level === "Elevated"
                              ? "bg-fuchsia-400"
                              : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${threatAssessment.threatScore}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Risk Trend</div>
                      <div className="mt-1 font-bold text-orange-100">
                        {threatAssessment.trend}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Confidence</div>
                      <div className="mt-1 font-bold text-cyan-100">
                        {threatAssessment.confidence}%
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Threat Pulse</div>
                      <div className="mt-1 font-bold text-fuchsia-100">
                        {threatAssessment.threatPulse}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Help Events</div>
                      <div className="mt-1 font-bold text-red-200">
                        {threatAssessment.recentHelpEvents}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                      TwinMe Intervention Recommendation
                    </div>

                    <p className="mt-2 text-sm leading-6 text-white/75">
                      {threatAssessment.recommendation}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xl font-black text-cyan-100">
                        {confidenceFactors.freshSignals}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                        Fresh Signals
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xl font-black text-emerald-100">
                        {confidenceFactors.located}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                        Located
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xl font-black text-fuchsia-100">
                        {confidenceFactors.total}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                        Crew Size
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                      Next Probable Event
                    </div>

                    <p className="mt-2 text-sm text-white/80">
                      {predictiveCrewInsight.likelyNextEvent}
                    </p>
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            <div id="crew-adaptive-intelligence" className="scroll-mt-6">
              <TwinSection
                title="Behind the Scenes"
                subtitle="TwinMe learning, feedback and behavior adaptation"
                tone="cyan"
                defaultOpen={false}
              >
                <AnimatedCard className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.05] p-5 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                        TwinMe Adaptive Intelligence
                      </div>

                      <h2 className="mt-2 text-lg font-black text-white">
                        AI Learning Dashboard
                      </h2>
                    </div>

                    <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                      {adaptiveDashboard.adaptationLevel}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Learning</div>
                      <div className="mt-1 text-xl font-black text-cyan-100">
                        {adaptiveDashboard.learningProgress}%
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Accuracy</div>
                      <div className="mt-1 text-xl font-black text-emerald-100">
                        {adaptiveDashboard.recommendationAccuracy}%
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Confidence</div>
                      <div className="mt-1 text-lg font-black text-fuchsia-100">
                        {adaptiveDashboard.confidenceTrend}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-white/45">Engine</div>
                      <div className="mt-1 text-lg font-black text-orange-100">
                        {adaptiveLearning.recommendationStrength}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                        Recommendation Feedback Loop
                      </div>

                      <div className="rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100">
                        {recommendationFeedback.learningState}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xl font-black text-emerald-100">
                          {recommendationFeedback.accepted}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Accepted
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xl font-black text-orange-100">
                          {recommendationFeedback.ignored}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Ignored
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-xl font-black text-cyan-100">
                          {recommendationFeedback.successRate}%
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Success Rate
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                        Behavior Adaptation Engine
                      </div>

                      <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
                        Adaptive
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <div className="text-lg font-black text-cyan-100">
                          {recommendationFeedback.successRate}%
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Trust
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <div className="text-lg font-black text-emerald-100">
                          {recommendationFeedback.accepted}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Accepted
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <div className="text-lg font-black text-orange-100">
                          {recommendationFeedback.ignored}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Ignored
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <div className="text-lg font-black text-violet-100">
                          {adaptiveDashboard.confidenceTrend}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                          Confidence
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                        TwinMe Adaptive Response
                      </div>

                      <p className="mt-2 text-sm leading-6 text-white/75">
                        TwinMe is adjusting future recommendations using
                        previously accepted decisions, stored memory confidence,
                        crew behavior trends, and current threat intelligence.
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-teal-300/20 bg-teal-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-200">
                          Routine Intelligence
                        </div>

                        <div className="rounded-full border border-teal-300/25 bg-teal-400/10 px-3 py-1 text-xs font-bold text-teal-100">
                          {routineIntelligence.consistency}%
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {routineIntelligence.dominantPattern}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Pattern
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {routineIntelligence.averageHour !== null
                              ? `${routineIntelligence.averageHour}:00`
                              : "--"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Avg Hour
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {routineIntelligence.weekdayCount}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Weekdays
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {routineIntelligence.weekendCount}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Weekends
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          TwinMe Routine Insight
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          TwinMe has analyzed{" "}
                          {routineIntelligence.totalCheckins} crew check-ins.
                          Current dominant pattern:{" "}
                          {routineIntelligence.dominantPattern}. Routine
                          consistency is {routineIntelligence.consistency}%.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-pink-300/20 bg-pink-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-pink-200">
                          Relationship Intelligence Dashboard
                        </div>

                        <div className="rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-bold text-pink-100">
                          {relationshipIntelligence.relationshipStrength}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {relationshipIntelligence.trustScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Trust
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {relationshipIntelligence.activeMembers}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Active
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-orange-100">
                            {relationshipIntelligence.helpLeaders}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Help Events
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-violet-100">
                            {relationshipIntelligence.checkIns}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Check-ins
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          TwinMe Relationship Insight
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {relationshipIntelligence.insight}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-200">
                          Emotional Context Dashboard
                        </div>

                        <div className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-100">
                          {emotionalContext.state}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {emotionalContext.emotionalScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-orange-100">
                            {emotionalContext.concernSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Concerns
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {emotionalContext.reassuranceSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Reassurance
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {emotionalContext.state}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            State
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          TwinMe Guidance
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {emotionalContext.guidance}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Autonomous TwinMe Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {autonomousTwinMe.readiness}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {autonomousTwinMe.weightedScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            AI Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {autonomousTwinMe.readiness}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Readiness
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {contextDecisionEngine.decisionLevel}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Decision
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {adaptiveDashboard.recommendationAccuracy}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Accuracy
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Unified Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {autonomousTwinMe.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Multi-Agent Intelligence Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {multiAgentCoordinator.status}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {multiAgentCoordinator.overallScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Overall
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {multiAgentCoordinator.activeAgents}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Active
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {multiAgentCoordinator.agents.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Agents
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {multiAgentCoordinator.status}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Status
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Agent Status
                        </div>

                        <div className="mt-3 space-y-2">
                          {multiAgentCoordinator.agents.map((agent) => (
                            <div
                              key={agent.name}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <span className="text-sm text-white/80">
                                {agent.name}
                              </span>
                              <span className="font-black text-cyan-100">
                                {agent.score}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          TwinCore Cloud Intelligence
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {cloudIntelligence.syncStatus}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {cloudIntelligence.sharedKnowledgeScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Knowledge
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {cloudIntelligence.synchronizedModules}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Modules
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {cloudIntelligence.syncStatus}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Sync
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            ☁️
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Cloud
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Cloud Insight
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {cloudIntelligence.cloudInsight}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Cross-Module Reasoning Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {crossModuleReasoning.reasoningState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {crossModuleReasoning.reasoningScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {crossModuleReasoning.strongestModule.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Strongest
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {crossModuleReasoning.weakestModule.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Weakest
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {crossModuleReasoning.moduleSignals.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Modules
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Unified Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {crossModuleReasoning.unifiedRecommendation}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Module Contributions
                        </div>

                        <div className="mt-3 space-y-2">
                          {crossModuleReasoning.moduleSignals.map((module) => (
                            <div
                              key={module.name}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <span className="text-sm text-white/80">
                                {module.name}
                              </span>

                              <span className="font-black text-cyan-100">
                                {module.score}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-purple-300/20 bg-purple-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-purple-200">
                          Long-Term Memory Dashboard
                        </div>

                        <div className="rounded-full border border-purple-300/25 bg-purple-400/10 px-3 py-1 text-xs font-bold text-purple-100">
                          {longTermMemory.memoryState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {longTermMemory.memoryStrength}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Strength
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {longTermMemory.retainedMemories}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Retained
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {longTermMemory.memories.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Categories
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {longTermMemory.memoryState}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            State
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          TwinMe Memory Insight
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {longTermMemory.insight}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Memory Categories
                        </div>

                        <div className="mt-3 space-y-2">
                          {longTermMemory.memories.map((memory) => (
                            <div
                              key={memory.category}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <span className="text-sm text-white/80">
                                {memory.category}
                              </span>

                              <span className="font-black text-cyan-100">
                                {memory.score}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">
                          Proactive TwinMe Dashboard
                        </div>

                        <div className="rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-100">
                          {proactiveTwinMe.mode}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {proactiveTwinMe.readiness}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Readiness
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {proactiveTwinMe.opportunities.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Opportunities
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {proactiveTwinMe.mode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            🤖
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            TwinMe
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Top Suggestion
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {proactiveTwinMe.topSuggestion}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Active Opportunities
                        </div>

                        <div className="mt-3 space-y-2">
                          {proactiveTwinMe.opportunities.map((item, index) => (
                            <div
                              key={`${item.type}-${index}`}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <span className="text-sm text-white/80">
                                {item.type}
                              </span>

                              <span className="font-black text-cyan-100">
                                {item.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          TwinCore Ecosystem Orchestrator
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {ecosystemOrchestrator.ecosystemState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {ecosystemOrchestrator.ecosystemScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Ecosystem
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {ecosystemOrchestrator.healthyModules}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Healthy
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {ecosystemOrchestrator.strongestModule.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Strongest
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {ecosystemOrchestrator.focusModule.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Focus
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Ecosystem Insight
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {ecosystemOrchestrator.orchestrationInsight}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Unified Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {ecosystemOrchestrator.nextAction}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Ecosystem Modules
                        </div>

                        <div className="mt-3 space-y-2">
                          {ecosystemOrchestrator.ecosystemModules.map(
                            (module) => (
                              <div
                                key={module.name}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {module.name}
                                </span>

                                <span className="font-black text-cyan-100">
                                  {module.score}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-200">
                          Intelligent Context Fusion Dashboard
                        </div>

                        <div className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-100">
                          {intelligentContextFusion.fusionState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {intelligentContextFusion.fusionScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Fusion
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {intelligentContextFusion.priority}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Priority
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {intelligentContextFusion.primaryContext.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Primary
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {intelligentContextFusion.secondaryContext.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Secondary
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Fused Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {intelligentContextFusion.fusedRecommendation}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Ranked Context Signals
                        </div>

                        <div className="mt-3 space-y-2">
                          {intelligentContextFusion.rankedContexts.map(
                            (context) => (
                              <div
                                key={context.name}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {context.name}
                                </span>

                                <span className="font-black text-cyan-100">
                                  {context.score}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Adaptive Decision Matrix Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {adaptiveDecisionMatrix.decisionState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {adaptiveDecisionMatrix.decisionScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {adaptiveDecisionMatrix.executionMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Execution
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {adaptiveDecisionMatrix.selectedDecision.source}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Selected
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {adaptiveDecisionMatrix.requiresConfirmation
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confirm
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Selected Decision
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {adaptiveDecisionMatrix.selectedDecision.action}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Fallback Decision
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {adaptiveDecisionMatrix.fallbackDecision.action}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Decision Candidates
                        </div>

                        <div className="mt-3 space-y-2">
                          {adaptiveDecisionMatrix.rankedCandidates.map(
                            (candidate) => (
                              <div
                                key={candidate.source}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {candidate.source}
                                </span>

                                <span className="font-black text-cyan-100">
                                  {candidate.confidence}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Predictive Action Planner Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {predictiveActionPlanner.planState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {predictiveActionPlanner.planningScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Planning
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {predictiveActionPlanner.executionWindow}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Execute
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {predictiveActionPlanner.primaryDecision.source}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Primary
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {predictiveActionPlanner.fallbackDecision.source}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Backup
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Predicted Outcome
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {predictiveActionPlanner.predictedOutcome}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Planned Action Sequence
                        </div>

                        <div className="mt-3 space-y-2">
                          {predictiveActionPlanner.actionSteps.map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <div>
                                <div className="text-sm text-white/90">
                                  {step.label}
                                </div>
                                <div className="text-xs text-white/45">
                                  {step.status}
                                </div>
                              </div>

                              <span className="font-black text-cyan-100">
                                {step.confidence}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-green-300/20 bg-green-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-green-200">
                          Outcome Validation Dashboard
                        </div>

                        <div className="rounded-full border border-green-300/25 bg-green-400/10 px-3 py-1 text-xs font-bold text-green-100">
                          {outcomeValidationEngine.outcomeState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {outcomeValidationEngine.evidenceScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Evidence
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {outcomeValidationEngine.validationMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {outcomeValidationEngine.recentCheckins}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Check-ins
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {outcomeValidationEngine.riskChanged ? "Yes" : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Risk Changed
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recommended Response
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {outcomeValidationEngine.recommendedResponse}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recent Signal Summary
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                            <div className="text-xl font-black text-red-200">
                              {outcomeValidationEngine.recentHelpSignals}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                              Help Signals
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                            <div className="text-xl font-black text-green-200">
                              {outcomeValidationEngine.recentSafeSignals}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                              Safe Signals
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                          Closed-Loop Learning Dashboard
                        </div>

                        <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {closedLoopLearning.learningState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {closedLoopLearning.learningGain}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Learning Gain
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {closedLoopLearning.updatedConfidence}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confidence
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {closedLoopLearning.validationSuccess
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Validated
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {closedLoopLearning.fallbackTriggered
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Fallback
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Learned Outcome
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {closedLoopLearning.learnedOutcome}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Learning Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {closedLoopLearning.nextLearningAction}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {closedLoopLearning.observedSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Signals
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {closedLoopLearning.adjustment > 0
                              ? `+${closedLoopLearning.adjustment}`
                              : closedLoopLearning.adjustment}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Adjustment
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Confidence Calibration Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {confidenceCalibrationEngine.calibrationState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {confidenceCalibrationEngine.predictedConfidence}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Predicted
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {confidenceCalibrationEngine.observedEvidence}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Evidence
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {confidenceCalibrationEngine.calibratedConfidence}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Calibrated
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {confidenceCalibrationEngine.reliabilityScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Reliability
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Calibration Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {confidenceCalibrationEngine.recommendation}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {confidenceCalibrationEngine.confidenceDirection}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Direction
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {confidenceCalibrationEngine.confidenceGap > 0
                              ? "+"
                              : ""}
                            {confidenceCalibrationEngine.confidenceGap}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confidence Gap
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
                          Uncertainty Awareness Dashboard
                        </div>

                        <div className="rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-100">
                          {uncertaintyAwarenessEngine.uncertaintyState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-yellow-100">
                            {uncertaintyAwarenessEngine.uncertaintyScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Uncertainty
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {uncertaintyAwarenessEngine.certaintyScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Certainty
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {uncertaintyAwarenessEngine.evidenceQuality}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Evidence
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {uncertaintyAwarenessEngine.communicationMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Why TwinMe Is Uncertain
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {uncertaintyAwarenessEngine.uncertaintyReason}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recommended Response
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {uncertaintyAwarenessEngine.recommendedResponse}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-red-200">
                            {uncertaintyAwarenessEngine.staleSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Stale
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-orange-200">
                            {uncertaintyAwarenessEngine.missingSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Missing
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {uncertaintyAwarenessEngine.conflictingEvidence
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Conflict
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {uncertaintyAwarenessEngine.requiresClarification
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Clarify
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-300/20 bg-slate-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">
                          Responsible Communication Dashboard
                        </div>

                        <div className="rounded-full border border-slate-300/25 bg-slate-400/10 px-3 py-1 text-xs font-bold text-slate-100">
                          {responsibleCommunicationEngine.communicationState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {responsibleCommunicationEngine.communicationScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {responsibleCommunicationEngine.tone}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Tone
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {responsibleCommunicationEngine.certaintyLabel}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Certainty
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {responsibleCommunicationEngine.shouldAskFirst
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Ask First
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          User Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {responsibleCommunicationEngine.userMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Disclosure
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {responsibleCommunicationEngine.disclosure}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Prompt
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {responsibleCommunicationEngine.nextPrompt}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">
                          User Consent & Control Dashboard
                        </div>

                        <div className="rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-100">
                          {userConsentControlEngine.consentState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {userConsentControlEngine.consentScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Consent
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {userConsentControlEngine.controlMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {userConsentControlEngine.autonomyAllowed
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Autonomy
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {userConsentControlEngine.needsConfirmation
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confirm
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recommended Control
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {userConsentControlEngine.recommendedControl}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          User Prompt
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {userConsentControlEngine.userPrompt}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Governance Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {userConsentControlEngine.governanceMessage}
                        </p>
                      </div>

                      <div className="mt-5 space-y-2">
                        {userConsentControlEngine.availableControls.map(
                          (control) => (
                            <div
                              key={control.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <span className="text-sm text-white/85">
                                {control.label}
                              </span>

                              <span className="font-black text-cyan-100">
                                {control.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
                          Permission Boundary Dashboard
                        </div>

                        <div className="rounded-full border border-red-300/25 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-100">
                          {permissionBoundaryEngine.boundaryState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {permissionBoundaryEngine.boundaryScore}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Boundary
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {permissionBoundaryEngine.executionAllowed
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Execute
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {permissionBoundaryEngine.userApprovalRequired
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Approval
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {permissionBoundaryEngine.safetyReviewRequired
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Safety
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Enforcement Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {permissionBoundaryEngine.enforcementAction}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Audit Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {permissionBoundaryEngine.auditMessage}
                        </p>
                      </div>

                      <div className="mt-5 space-y-2">
                        {permissionBoundaryEngine.allowedCapabilities.map(
                          (item) => (
                            <div
                              key={item.capability}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <div>
                                <div className="text-sm text-white/90">
                                  {item.capability}
                                </div>
                                <div className="text-xs text-white/45">
                                  {item.reason}
                                </div>
                              </div>

                              <span className="font-black text-cyan-100">
                                {item.allowed ? "Allowed" : "Blocked"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Decision Audit & Explainability Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {decisionAuditEngine.explainabilityState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {decisionAuditEngine.auditScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Audit Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {decisionAuditEngine.passedChecks}/
                            {decisionAuditEngine.totalChecks}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Checks
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {decisionAuditEngine.finalDisposition}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Disposition
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-sm font-black text-violet-100 break-all">
                            {decisionAuditEngine.traceId}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Trace ID
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Decision Reason
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {decisionAuditEngine.decisionReason}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Permission Reason
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {decisionAuditEngine.boundaryReason}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          User Explanation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {decisionAuditEngine.userExplanation}
                        </p>
                      </div>

                      <div className="mt-5 space-y-2">
                        {decisionAuditEngine.auditSteps.map((step) => (
                          <div
                            key={step.id}
                            className="rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-cyan-100">
                                {step.stage}
                              </span>

                              <span className="text-xs font-bold text-white/70">
                                {step.status}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-white/75">
                              {step.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-green-300/20 bg-green-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-green-200">
                          Safe Execution Readiness Dashboard
                        </div>

                        <div className="rounded-full border border-green-300/25 bg-green-400/10 px-3 py-1 text-xs font-bold text-green-100">
                          {safeExecutionReadinessEngine.readinessState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {safeExecutionReadinessEngine.readinessScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Readiness
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {safeExecutionReadinessEngine.passedGates}/
                            {safeExecutionReadinessEngine.gates.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Gates Passed
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {safeExecutionReadinessEngine.executionReady
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Execute
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {safeExecutionReadinessEngine.rollbackReady
                              ? "Ready"
                              : "Unavailable"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Rollback
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            Execution Mode
                          </div>

                          <span className="text-sm font-black text-cyan-100">
                            {safeExecutionReadinessEngine.executionMode}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Execution Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {safeExecutionReadinessEngine.executionSummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Required Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {safeExecutionReadinessEngine.readinessAction}
                        </p>
                      </div>

                      {safeExecutionReadinessEngine.nextRequiredGate && (
                        <div className="mt-5 rounded-2xl border border-orange-300/20 bg-orange-400/[0.05] p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">
                            Next Required Gate
                          </div>

                          <div className="mt-2 text-sm font-black text-white">
                            {safeExecutionReadinessEngine.nextRequiredGate.name}
                          </div>

                          <div className="mt-1 text-xs text-white/55">
                            Score:{" "}
                            {
                              safeExecutionReadinessEngine.nextRequiredGate
                                .score
                            }
                          </div>
                        </div>
                      )}

                      <div className="mt-5 space-y-2">
                        {safeExecutionReadinessEngine.gates.map((gate) => (
                          <div
                            key={gate.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                          >
                            <div>
                              <div className="text-sm font-bold text-white/90">
                                {gate.name}
                              </div>

                              <div className="mt-1 text-xs text-white/45">
                                Score: {gate.score}
                              </div>
                            </div>

                            <span className="font-black text-cyan-100">
                              {gate.passed ? "Passed" : "Blocked"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Execution Simulation Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {executionSimulationEngine.simulationState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {executionSimulationEngine.simulationScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Simulation
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {executionSimulationEngine.successProbability}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Success
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-orange-100">
                            {executionSimulationEngine.riskProbability}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Risk
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {executionSimulationEngine.fallbackViable
                              ? "Ready"
                              : "Unavailable"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Fallback
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Simulated Outcome
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {executionSimulationEngine.simulatedOutcome}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Execution Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {executionSimulationEngine.executionRecommendation}
                        </p>
                      </div>

                      {executionSimulationEngine.failurePoint && (
                        <div className="mt-5 rounded-2xl border border-orange-300/20 bg-orange-400/[0.05] p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">
                            Primary Failure Point
                          </div>

                          <div className="mt-2 text-sm font-black text-white">
                            {executionSimulationEngine.failurePoint.name}
                          </div>

                          <div className="mt-1 text-xs text-white/55">
                            Score:{" "}
                            {executionSimulationEngine.failurePoint.score}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 space-y-2">
                        {executionSimulationEngine.simulationFactors.map(
                          (factor) => (
                            <div
                              key={factor.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                            >
                              <div>
                                <div className="text-sm font-bold text-white/90">
                                  {factor.name}
                                </div>

                                <div className="mt-1 text-xs text-white/45">
                                  Score: {factor.score}
                                </div>
                              </div>

                              <span className="font-black text-cyan-100">
                                {factor.passed ? "Passed" : "Blocked"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Controlled Execution Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {controlledExecutionOrchestrator.executionState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {controlledExecutionOrchestrator.executionScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {controlledExecutionOrchestrator.executionAuthorized
                              ? "Authorized"
                              : "Held"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Status
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {controlledExecutionOrchestrator.executionMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {
                              controlledExecutionOrchestrator.blockedSteps
                                .length
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Blocked
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Current Step
                        </div>

                        <p className="mt-2 text-sm text-white/80">
                          {controlledExecutionOrchestrator.currentStep?.label}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Orchestration Action
                        </div>

                        <p className="mt-2 text-sm text-white/80">
                          {controlledExecutionOrchestrator.orchestrationAction}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Rollback Plan
                        </div>

                        <p className="mt-2 text-sm text-white/80">
                          {controlledExecutionOrchestrator.rollbackPlan}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Guardrail
                        </div>

                        <p className="mt-2 text-sm text-white/80">
                          {controlledExecutionOrchestrator.guardrailMessage}
                        </p>
                      </div>

                      <div className="mt-5 space-y-2">
                        {controlledExecutionOrchestrator.executionSteps.map(
                          (step) => (
                            <div
                              key={step.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                            >
                              <div>
                                <div className="text-sm font-bold text-white/90">
                                  {step.order}. {step.label}
                                </div>

                                <div className="mt-1 text-xs text-white/45">
                                  Required: {step.required ? "Yes" : "No"}
                                </div>
                              </div>

                              <span className="font-black text-cyan-100">
                                {step.status}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                          Live Execution Monitoring Dashboard
                        </div>

                        <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {liveExecutionMonitoringEngine.executionHealth}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {liveExecutionMonitoringEngine.monitoringScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Monitoring
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {liveExecutionMonitoringEngine.progressState}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Progress
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {liveExecutionMonitoringEngine.executionActive
                              ? "Active"
                              : "Standby"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Status
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {liveExecutionMonitoringEngine.nextCheckpoint}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Checkpoint
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {liveExecutionMonitoringEngine.recentSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Recent
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {liveExecutionMonitoringEngine.activeSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Active
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-red-100">
                            {liveExecutionMonitoringEngine.helpSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Help
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-yellow-100">
                            {liveExecutionMonitoringEngine.rollbackRecommended
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Rollback
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Monitoring Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {liveExecutionMonitoringEngine.monitoringMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recommended Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {liveExecutionMonitoringEngine.recommendedAction}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <span className="text-sm text-white/80">
                          Risk Escalated
                        </span>

                        <span className="font-black text-cyan-100">
                          {liveExecutionMonitoringEngine.riskEscalated
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <span className="text-sm text-white/80">
                          Stale Execution
                        </span>

                        <span className="font-black text-cyan-100">
                          {liveExecutionMonitoringEngine.staleExecution
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-200">
                          Rollback & Recovery Dashboard
                        </div>

                        <div className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-100">
                          {rollbackRecoveryEngine.recoveryState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {rollbackRecoveryEngine.recoveryScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Recovery
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {rollbackRecoveryEngine.recoveryMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {rollbackRecoveryEngine.rollbackTriggered
                              ? "Yes"
                              : "No"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Rollback
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {rollbackRecoveryEngine.fallbackAvailable
                              ? "Ready"
                              : "Unavailable"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Fallback
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recovery Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {rollbackRecoveryEngine.recoveryMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recovery Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {rollbackRecoveryEngine.recoveryAction}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            Resume Status
                          </div>

                          <span className="font-black text-cyan-100">
                            {rollbackRecoveryEngine.resumeAllowed
                              ? "Allowed"
                              : "Blocked"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-white/75">
                          {rollbackRecoveryEngine.resumeCondition}
                        </p>
                      </div>

                      <div className="mt-5 space-y-2">
                        {rollbackRecoveryEngine.recoverySteps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                          >
                            <div>
                              <div className="text-sm font-bold text-white/90">
                                {step.order}. {step.label}
                              </div>
                            </div>

                            <span className="font-black text-cyan-100">
                              {step.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">
                          Post-Execution Outcome Dashboard
                        </div>

                        <div className="rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-100">
                          {postExecutionOutcomeEngine.outcomeState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {postExecutionOutcomeEngine.outcomeScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Outcome
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {postExecutionOutcomeEngine.outcomeClassification}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Classification
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {postExecutionOutcomeEngine.positiveSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Positive
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-red-100">
                            {postExecutionOutcomeEngine.negativeSignals}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Negative
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-sm font-black text-cyan-100">
                            {postExecutionOutcomeEngine.executionCompleted
                              ? "Completed"
                              : "Pending"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Execution
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-sm font-black text-emerald-100">
                            {postExecutionOutcomeEngine.recoveryCompleted
                              ? "Recovered"
                              : "Not Required"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Recovery
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Outcome Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {postExecutionOutcomeEngine.outcomeSummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Learned Pattern
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {postExecutionOutcomeEngine.learnedPattern}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            Learning Weight
                          </span>

                          <span className="font-black text-cyan-100">
                            {postExecutionOutcomeEngine.learningWeight}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            Confidence Adjustment
                          </span>

                          <span className="font-black text-emerald-100">
                            {postExecutionOutcomeEngine.confidenceAdjustment}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {postExecutionOutcomeEngine.nextAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Experience Memory Consolidation Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {
                            experienceMemoryConsolidationEngine.consolidationState
                          }
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {experienceMemoryConsolidationEngine.memoryStrength}
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Strength
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {experienceMemoryConsolidationEngine.memoryType}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Type
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {
                              experienceMemoryConsolidationEngine.retentionPriority
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Priority
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {experienceMemoryConsolidationEngine.storeInLongTermMemory
                              ? "Store"
                              : "Hold"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Action
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Memory Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {experienceMemoryConsolidationEngine.memorySummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Reusable Pattern
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {experienceMemoryConsolidationEngine.reusablePattern}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Retrieval Cue
                        </div>

                        <p className="mt-2 break-all text-sm text-cyan-100">
                          {experienceMemoryConsolidationEngine.retrievalCue}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            Confidence Update
                          </span>

                          <span className="font-black text-emerald-100">
                            {experienceMemoryConsolidationEngine.updateConfidence >
                            0
                              ? "+"
                              : ""}
                            {
                              experienceMemoryConsolidationEngine.updateConfidence
                            }
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Experience Tags
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {experienceMemoryConsolidationEngine.experienceTags.map(
                            (tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100"
                              >
                                {tag}
                              </span>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Memory Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {experienceMemoryConsolidationEngine.nextMemoryAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Experience Retrieval & Transfer Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {experienceRetrievalTransferEngine.transferState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {experienceRetrievalTransferEngine.similarityScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Similarity
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {experienceRetrievalTransferEngine.transferStrength}
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Transfer
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {experienceRetrievalTransferEngine.memoryAvailable
                              ? "Available"
                              : "None"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Memory
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {experienceRetrievalTransferEngine.retrievalEligible
                              ? "Eligible"
                              : "No Match"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Retrieval
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Retrieved Pattern
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {experienceRetrievalTransferEngine.retrievedPattern}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Transfer Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            experienceRetrievalTransferEngine.transferredRecommendation
                          }
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-sm font-black text-cyan-100">
                            {experienceRetrievalTransferEngine.confidenceInfluence >
                            0
                              ? "+"
                              : ""}
                            {
                              experienceRetrievalTransferEngine.confidenceInfluence
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confidence
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-sm font-black text-emerald-100">
                            {experienceRetrievalTransferEngine.riskInfluence}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Risk
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Shared Context Signals
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {experienceRetrievalTransferEngine.sharedTokens.map(
                            (token) => (
                              <span
                                key={token}
                                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100"
                              >
                                {token}
                              </span>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Transfer Reason
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {experienceRetrievalTransferEngine.transferReason}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Transfer Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {experienceRetrievalTransferEngine.nextTransferAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Personalized Reasoning Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {personalizedReasoningEngine.reasoningProfile}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {personalizedReasoningEngine.personalizationScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Personalization
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {personalizedReasoningEngine.reasoningMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {personalizedReasoningEngine.recommendationStyle}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Style
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {personalizedReasoningEngine.confidenceBoost > 0
                              ? "+"
                              : ""}
                            {personalizedReasoningEngine.confidenceBoost}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confidence
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Reasoning Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {personalizedReasoningEngine.reasoningSummary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
                          Daily Relevance Ranking Dashboard
                        </div>

                        <div className="rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-100">
                          {dailyRelevanceRankingEngine.relevanceState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {dailyRelevanceRankingEngine.dailyBriefingMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Briefing
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {dailyRelevanceRankingEngine.visibleItems.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Visible
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-orange-100">
                            {dailyRelevanceRankingEngine.hiddenItemCount}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Hidden
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-violet-100">
                            {dailyRelevanceRankingEngine.topItem
                              ?.relevanceScore ?? 0}
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Top Score
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Highest Priority
                        </div>

                        <p className="mt-2 text-sm font-semibold text-cyan-100">
                          {dailyRelevanceRankingEngine.topItem?.category}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {dailyRelevanceRankingEngine.topItem?.title}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Ranked Categories
                        </div>

                        <div className="mt-3 space-y-2">
                          {dailyRelevanceRankingEngine.visibleItems.map(
                            (item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {item.category}
                                </span>

                                <span className="font-black text-cyan-100">
                                  {item.relevanceScore}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Briefing Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {dailyRelevanceRankingEngine.briefingSummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Briefing Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {dailyRelevanceRankingEngine.nextBriefingAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.05] p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                            {fyiTodayCompositionEngine.poweredBy}
                          </div>

                          <h2 className="mt-2 text-2xl font-black text-white">
                            {fyiTodayCompositionEngine.heading}
                          </h2>
                        </div>

                        <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {fyiTodayCompositionEngine.compositionState}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                              Briefing
                            </div>

                            <p className="mt-2 text-lg font-bold text-white">
                              {fyiTodayCompositionEngine.briefingIntro}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-black text-cyan-100">
                              {fyiTodayCompositionEngine.compositionScore}%
                            </div>

                            <div className="text-[10px] uppercase tracking-wide text-white/45">
                              Composition
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
                        <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">
                          Primary Update
                        </div>

                        <div className="mt-3 flex items-start gap-3">
                          <div className="text-3xl">
                            {fyiTodayCompositionEngine.primarySection?.icon}
                          </div>

                          <div className="flex-1">
                            <div className="font-black text-white">
                              {
                                fyiTodayCompositionEngine.primarySection
                                  ?.category
                              }
                            </div>

                            <p className="mt-2 text-sm leading-6 text-white/75">
                              {fyiTodayCompositionEngine.heroMessage}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Supporting Sections
                        </div>

                        <div className="mt-3 space-y-2">
                          {fyiTodayCompositionEngine.supportingSections.map(
                            (section) => (
                              <div
                                key={section.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <div className="flex items-center gap-3">
                                  <span>{section.icon}</span>

                                  <div>
                                    <div className="text-sm font-semibold text-white">
                                      {section.category}
                                    </div>

                                    <div className="text-xs text-white/55">
                                      {section.emphasis}
                                    </div>
                                  </div>
                                </div>

                                <div className="font-black text-cyan-100">
                                  {section.relevanceScore}%
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {fyiTodayCompositionEngine.actionLabel}
                          </div>

                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Primary Action
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-xl font-black text-orange-100">
                            {fyiTodayCompositionEngine.hiddenLowValueCount}
                          </div>

                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Hidden Updates
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Footer
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {fyiTodayCompositionEngine.footerMessage}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Adaptive FYI Presentation Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {adaptiveFyiPresentationEngine.presentationState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {adaptiveFyiPresentationEngine.presentationScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {adaptiveFyiPresentationEngine.presentationMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {adaptiveFyiPresentationEngine.sectionDensity}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Density
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {adaptiveFyiPresentationEngine.motionIntensity}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Motion
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Displayed Sections
                        </div>

                        <div className="mt-3 space-y-2">
                          {adaptiveFyiPresentationEngine.displayedSections.map(
                            (section) => (
                              <div
                                key={section.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {section.icon} {section.category}
                                </span>

                                <span className="font-black text-cyan-100">
                                  {section.relevanceScore}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {adaptiveFyiPresentationEngine.showPrimaryAction
                              ? "Visible"
                              : "Hidden"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Primary Action
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-xl font-black text-orange-100">
                            {
                              adaptiveFyiPresentationEngine.collapsedSections
                                .length
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Collapsed
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Presentation Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {adaptiveFyiPresentationEngine.presentationMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {adaptiveFyiPresentationEngine.nextPresentationAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          FYI Interaction & Feedback Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {fyiInteractionFeedbackEngine.interactionState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {fyiInteractionFeedbackEngine.interactionScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Interaction
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {fyiInteractionFeedbackEngine.primaryActionType}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Action
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {fyiInteractionFeedbackEngine.engagementRate}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Engagement
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {fyiInteractionFeedbackEngine.feedbackSignal}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Feedback
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {fyiInteractionFeedbackEngine.actionPermitted
                              ? "Ready"
                              : "Restricted"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Permission
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {fyiInteractionFeedbackEngine.primaryActionState}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Action State
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Learning Adjustment
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {fyiInteractionFeedbackEngine.learningAdjustment}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Action Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {fyiInteractionFeedbackEngine.actionMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Interaction Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {fyiInteractionFeedbackEngine.nextInteractionAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Contextual FYI Timing Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {contextualFyiTimingEngine.timingState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {contextualFyiTimingEngine.timingScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Timing Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {contextualFyiTimingEngine.timingPriority}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Priority
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {contextualFyiTimingEngine.deliveryMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Delivery
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {contextualFyiTimingEngine.delayMinutes} min
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Delay
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {contextualFyiTimingEngine.notificationAllowed
                              ? "Allowed"
                              : "Blocked"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Notification
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {contextualFyiTimingEngine.confirmationNeeded
                              ? "Required"
                              : "Not Required"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confirmation
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Quiet Reason
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {contextualFyiTimingEngine.quietReason ??
                            "No suppression required."}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Delivery Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {contextualFyiTimingEngine.deliveryMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Timing Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {contextualFyiTimingEngine.nextTimingAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-lime-200">
                          Proactive Opportunity Dashboard
                        </div>

                        <div className="rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-100">
                          {proactiveOpportunityEngine.opportunityState}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Top Opportunity
                        </div>

                        <div className="mt-2 text-xl font-black text-white">
                          {proactiveOpportunityEngine.topOpportunity
                            ?.category ?? "None"}
                        </div>

                        <div className="mt-1 text-sm text-white/70">
                          {proactiveOpportunityEngine.topOpportunity?.title ??
                            "No qualifying opportunity detected."}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-2xl font-black text-cyan-100">
                            {proactiveOpportunityEngine.topOpportunity
                              ?.opportunityScore ?? 0}
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Opportunity Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-2xl font-black text-emerald-100">
                            {proactiveOpportunityEngine.opportunities.length}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Opportunities
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {proactiveOpportunityEngine.recommendation}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Ranked Opportunities
                        </div>

                        <div className="mt-3 space-y-2">
                          {proactiveOpportunityEngine.opportunities
                            .slice(0, 5)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    {item.category}
                                  </div>

                                  <div className="text-xs text-white/55">
                                    {item.title}
                                  </div>
                                </div>

                                <div className="font-black text-lime-100">
                                  {item.opportunityScore}%
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-green-300/20 bg-green-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-green-200">
                          Opportunity Action Planning Dashboard
                        </div>

                        <div className="rounded-full border border-green-300/25 bg-green-400/10 px-3 py-1 text-xs font-bold text-green-100">
                          {opportunityActionPlanningEngine.planningState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {opportunityActionPlanningEngine.planningScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Planning Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {opportunityActionPlanningEngine.actionPriority}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Priority
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {opportunityActionPlanningEngine.actionMode}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {opportunityActionPlanningEngine.actionAuthorized
                              ? "Authorized"
                              : "Held"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Authorization
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Suggested Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityActionPlanningEngine.suggestedAction}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Timing Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityActionPlanningEngine.timingRecommendation}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Fallback Plan
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityActionPlanningEngine.fallbackPlan}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Action Steps
                        </div>

                        <div className="mt-3 space-y-2">
                          {opportunityActionPlanningEngine.actionSteps.map(
                            (step) => (
                              <div
                                key={step.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {step.order}. {step.label}
                                </span>

                                <span className="font-black text-green-100">
                                  {step.status}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Planning Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityActionPlanningEngine.nextPlanningAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Opportunity Readiness Gate Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {opportunityReadinessGateEngine.readinessState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {opportunityReadinessGateEngine.readinessScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Readiness
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {opportunityReadinessGateEngine.gateDecision}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Gate
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {opportunityReadinessGateEngine.passedChecks}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Passed
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-rose-100">
                            {opportunityReadinessGateEngine.failedChecks}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Failed
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Readiness Checks
                        </div>

                        <div className="mt-3 space-y-2">
                          {opportunityReadinessGateEngine.readinessChecks.map(
                            (check) => (
                              <div
                                key={check.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {check.label}
                                </span>

                                <span className="font-black text-indigo-100">
                                  {check.passed ? "Passed" : "Pending"}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Blocking Reasons
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityReadinessGateEngine.blockingReasons.length
                            ? opportunityReadinessGateEngine.blockingReasons.join(
                                ", ",
                              )
                            : "No blocking conditions detected."}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Readiness Message
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityReadinessGateEngine.readinessMessage}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Readiness Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityReadinessGateEngine.nextReadinessAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                          Controlled Opportunity Presentation Dashboard
                        </div>

                        <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {
                            controlledOpportunityPresentationEngine.presentationState
                          }
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {
                              controlledOpportunityPresentationEngine.presentationScore
                            }
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {
                              controlledOpportunityPresentationEngine.presentationDecision
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Decision
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {
                              controlledOpportunityPresentationEngine.presentationMode
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Mode
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {
                              controlledOpportunityPresentationEngine.presentationPriority
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Priority
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Opportunity
                        </div>

                        <div className="mt-2 text-lg font-black text-white">
                          {
                            controlledOpportunityPresentationEngine.presentationTitle
                          }
                        </div>

                        <p className="mt-2 text-sm text-white/75">
                          {
                            controlledOpportunityPresentationEngine.presentationBody
                          }
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-sm font-black text-emerald-100">
                            {
                              controlledOpportunityPresentationEngine.primaryActionLabel
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Primary Action
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-sm font-black text-orange-100">
                            {
                              controlledOpportunityPresentationEngine.secondaryActionLabel
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Secondary Action
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Audit Summary
                        </div>

                        <div className="mt-3 space-y-2">
                          {controlledOpportunityPresentationEngine.auditSummary.map(
                            (item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                              >
                                <span className="text-sm text-white/80">
                                  {item.label}
                                </span>

                                <span className="font-black text-cyan-100">
                                  {item.status}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Explanation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {controlledOpportunityPresentationEngine.explanation}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Presentation Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            controlledOpportunityPresentationEngine.nextPresentationAction
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Opportunity Response Intelligence Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {opportunityResponseIntelligenceEngine.responseState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {
                              opportunityResponseIntelligenceEngine.responseConfidence
                            }
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confidence
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {
                              opportunityResponseIntelligenceEngine.likelyResponse
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Likely Response
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {
                              opportunityResponseIntelligenceEngine.historicalAcceptanceRate
                            }
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Acceptance
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {
                              opportunityResponseIntelligenceEngine.learningSignal
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Learning
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Expected Outcome
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            opportunityResponseIntelligenceEngine.expectedOutcome
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Feedback Adjustment
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            opportunityResponseIntelligenceEngine.feedbackAdjustment
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Follow-up Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {opportunityResponseIntelligenceEngine.followUpAction}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Response Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            opportunityResponseIntelligenceEngine.responseSummary
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Long-Term Personal Knowledge Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {longTermPersonalKnowledgeEngine.maturityLevel}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {longTermPersonalKnowledgeEngine.knowledgeScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Knowledge
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {longTermPersonalKnowledgeEngine.memoryStrength}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Memory
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {longTermPersonalKnowledgeEngine.retainedMemories}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Retained
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {longTermPersonalKnowledgeEngine.learningConfidence}
                            %
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Confidence
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {longTermPersonalKnowledgeEngine.successfulPatterns}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Successful
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {
                              longTermPersonalKnowledgeEngine.unsuccessfulPatterns
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Unsuccessful
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Dominant Learning Focus
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            longTermPersonalKnowledgeEngine.dominantLearningFocus
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Personalization Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            longTermPersonalKnowledgeEngine.personalizationSummary
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Knowledge Goal
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {longTermPersonalKnowledgeEngine.nextKnowledgeGoal}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                          Personal Evolution & Identity Dashboard
                        </div>

                        <div className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-3 py-1 text-xs font-bold text-indigo-100">
                          {personalEvolutionIdentityEngine.identityMaturity}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {personalEvolutionIdentityEngine.evolutionScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Evolution
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {personalEvolutionIdentityEngine.evolutionDirection}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Direction
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {
                              personalEvolutionIdentityEngine.preferenceStability
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Preferences
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {
                              personalEvolutionIdentityEngine.behavioralConsistency
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Behavior
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Decision Identity
                          </div>
                          <div className="mt-2 font-black text-emerald-100">
                            {personalEvolutionIdentityEngine.decisionIdentity}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Communication Identity
                          </div>
                          <div className="mt-2 font-black text-cyan-100">
                            {
                              personalEvolutionIdentityEngine.communicationIdentity
                            }
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Strongest Identity Signal
                        </div>

                        <p className="mt-2 text-sm text-white/75">
                          {
                            personalEvolutionIdentityEngine
                              .strongestIdentitySignal.label
                          }
                          {" — "}
                          {
                            personalEvolutionIdentityEngine
                              .strongestIdentitySignal.state
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Adaptation Focus
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {personalEvolutionIdentityEngine.adaptationFocus}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Identity Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {personalEvolutionIdentityEngine.identitySummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Evolution Goal
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {personalEvolutionIdentityEngine.nextEvolutionGoal}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Future Alignment & Life Direction Dashboard
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {futureAlignmentLifeDirectionEngine.alignmentState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {futureAlignmentLifeDirectionEngine.alignmentScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Alignment
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {futureAlignmentLifeDirectionEngine.lifeDirection}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Direction
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {
                              futureAlignmentLifeDirectionEngine.momentumDirection
                            }
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Momentum
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {futureAlignmentLifeDirectionEngine.directionRisk}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Risk
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Strongest Signal
                          </div>
                          <div className="mt-2 font-black text-emerald-100">
                            {
                              futureAlignmentLifeDirectionEngine
                                .strongestAlignmentSignal.label
                            }
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Weakest Signal
                          </div>
                          <div className="mt-2 font-black text-orange-100">
                            {
                              futureAlignmentLifeDirectionEngine
                                .weakestAlignmentSignal.label
                            }
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Recommended Direction
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            futureAlignmentLifeDirectionEngine.recommendedDirection
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Course Correction
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {futureAlignmentLifeDirectionEngine.courseCorrection}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Alignment Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {futureAlignmentLifeDirectionEngine.alignmentSummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Alignment Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            futureAlignmentLifeDirectionEngine.nextAlignmentAction
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                          Holistic Life Guidance Dashboard
                        </div>

                        <div className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-100">
                          {holisticLifeGuidanceOrchestrator.guidanceState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {holisticLifeGuidanceOrchestrator.guidanceScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Guidance
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {holisticLifeGuidanceOrchestrator.guidanceDecision}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Decision
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {holisticLifeGuidanceOrchestrator.guidancePriority}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Priority
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {holisticLifeGuidanceOrchestrator.userControlState}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            User Control
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-2xl font-black text-emerald-100">
                            {holisticLifeGuidanceOrchestrator.readyPillars}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-white/45">
                            Ready Pillars
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-2xl font-black text-orange-100">
                            {holisticLifeGuidanceOrchestrator.heldPillars}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-white/45">
                            Held Pillars
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Primary Guidance
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {holisticLifeGuidanceOrchestrator.primaryGuidance}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Strongest Pillar
                          </div>
                          <div className="mt-2 font-black text-emerald-100">
                            {
                              holisticLifeGuidanceOrchestrator
                                .strongestGuidancePillar.label
                            }
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-wide text-white/45">
                            Weakest Pillar
                          </div>
                          <div className="mt-2 font-black text-orange-100">
                            {
                              holisticLifeGuidanceOrchestrator
                                .weakestGuidancePillar.label
                            }
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Orchestration Summary
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {
                            holisticLifeGuidanceOrchestrator.orchestrationMessage
                          }
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Guidance Action
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {holisticLifeGuidanceOrchestrator.nextGuidanceAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                          TwinMe Intelligence Completion & Launch Readiness
                          Dashboard
                        </div>

                        <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
                          {twinMeLaunchReadinessEngine.readinessState}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {twinMeLaunchReadinessEngine.launchScore}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Launch Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-emerald-100">
                            {twinMeLaunchReadinessEngine.completionPercentage}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Completion
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {twinMeLaunchReadinessEngine.certificationDecision}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Certification
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {twinMeLaunchReadinessEngine.criticalSystemsPassed
                              ? "PASS"
                              : "CHECK"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Critical Systems
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-2xl font-black text-emerald-100">
                            {twinMeLaunchReadinessEngine.passedChecks}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-white/45">
                            Passed Checks
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                          <div className="text-2xl font-black text-orange-100">
                            {twinMeLaunchReadinessEngine.heldChecks}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-wide text-white/45">
                            Held Checks
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Strongest System
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          {twinMeLaunchReadinessEngine.strongestSystem.label}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Weakest System
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          {twinMeLaunchReadinessEngine.weakestSystem.label}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Launch Summary
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          {twinMeLaunchReadinessEngine.systemSummary}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Launch Recommendation
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          {twinMeLaunchReadinessEngine.launchRecommendation}
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Next Launch Action
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          {twinMeLaunchReadinessEngine.nextLaunchAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-400/[0.04] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                          Context-Aware Decision Engine
                        </div>

                        <div className="rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-100">
                          {contextDecisionEngine.decisionLevel}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-xl font-black text-cyan-100">
                            {contextDecisionEngine.score}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Context Score
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-emerald-100">
                            {contextDecisionEngine.decisionLevel}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Decision
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-orange-100">
                            {threatAssessment.level}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Threat
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-violet-100">
                            {adaptiveDashboard.recommendationAccuracy}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            AI Accuracy
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Live Recommendation
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {contextDecisionEngine.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                          Predictive Behavior Model
                        </div>

                        <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-100">
                          {predictiveBehaviorModel.predictionConfidence}%
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-lg font-black text-cyan-100">
                            {predictiveBehaviorModel.predictionConfidence}%
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Forecast
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-sm font-black text-emerald-100">
                            {predictiveBehaviorModel.predictionWindow}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Window
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-sm font-black text-orange-100">
                            {predictiveBehaviorModel.autonomousReady
                              ? "Ready"
                              : "Learning"}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Autonomy
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <div className="text-sm font-black text-violet-100">
                            {contextDecisionEngine.decisionLevel}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                            Decision
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Predicted Next Behavior
                        </div>

                        <p className="mt-2 text-sm leading-6 text-white/80">
                          {predictiveBehaviorModel.nextBehavior}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            <div id="crew-timeline" className="scroll-mt-6">
              <TwinSection
                title="Recent Activity"
                subtitle="Recent crew activity and events"
                tone="cyan"
                defaultOpen={false}
              >
                <AnimatedCard className="mb-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                        Crew Timeline
                      </div>

                      <h2 className="mt-2 text-lg font-black text-white">
                        Recent Crew Activity
                      </h2>
                    </div>

                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                      LIVE
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {crewTimeline.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                        No recent crew activity.
                      </div>
                    ) : (
                      crewTimeline.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-white">
                                {entry.member}
                              </div>

                              <div className="text-sm text-white/60">
                                {entry.event}
                              </div>
                            </div>

                            <div className="text-xs text-cyan-200">
                              {entry.minutesAgo} min ago
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            <div id="crew-memory" className="scroll-mt-6">
              <TwinSection
                title="Crew Memory"
                subtitle="Patterns and memories TwinMe has learned"
                tone="fuchsia"
                defaultOpen={false}
              >
                <AnimatedCard className="mb-4 rounded-3xl border border-violet-300/20 bg-violet-400/[0.05] p-5 shadow-[0_0_35px_rgba(139,92,246,0.10)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">
                        TwinMe Memory Layer
                      </div>

                      <h2 className="mt-2 text-lg font-black text-white">
                        Learned Memories
                      </h2>
                    </div>

                    <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100">
                      {memoryTimeline.length} Stored
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/55">
                    Persistent memories TwinMe can use for future pattern
                    recognition and recommendations.
                  </p>

                  <div className="mt-5 space-y-3">
                    {memoryTimeline.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                        TwinMe has not stored any memories yet.
                      </div>
                    ) : (
                      memoryTimeline.map((memory) => {
                        const minutesAgo = Math.max(
                          0,
                          Math.floor(
                            (Date.now() -
                              new Date(memory.created_at).getTime()) /
                              60000,
                          ),
                        );

                        return (
                          <div
                            key={memory.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
                                  {memory.memory_type}
                                </div>

                                <div className="mt-1 font-semibold text-white">
                                  {memory.title}
                                </div>

                                <p className="mt-2 text-sm leading-6 text-white/60">
                                  {memory.summary}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-sm font-black text-cyan-100">
                                  {memory.confidence}%
                                </div>

                                <div className="text-[10px] uppercase tracking-wide text-white/40">
                                  confidence
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 text-xs text-white/40">
                              {minutesAgo < 1
                                ? "Just now"
                                : minutesAgo < 60
                                  ? `${minutesAgo} min ago`
                                  : `${Math.floor(minutesAgo / 60)} hr ago`}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            <div id="crew-insight" className="scroll-mt-6">
              <TwinSection
                title="TwinMe Crew Read"
                subtitle="TwinMe interpretation and recommended action"
                tone="cyan"
                defaultOpen={crewStats.flagged > 0}
              >
                <AnimatedCard className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 shadow-[0_0_35px_rgba(34,211,238,0.10)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                        TwinMe Crew Insight
                      </div>

                      <h2 className="mt-2 text-lg font-black text-white">
                        Crew presence summary
                      </h2>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        crewPresenceInsight.loneMemberCount > 0
                          ? "border-orange-300/25 bg-orange-300/10 text-orange-100"
                          : crewPresenceInsight.staleMemberCount > 0
                            ? "border-red-300/25 bg-red-300/10 text-red-100"
                            : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                      }`}
                    >
                      {crewPresenceInsight.loneMemberCount > 0
                        ? "Separation detected"
                        : crewPresenceInsight.staleMemberCount > 0
                          ? "Signal check"
                          : "Connected"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/65">
                    {crewPresenceInsight.message}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xl font-black text-white">
                        {crewPresenceInsight.loneMemberCount}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                        Separated
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xl font-black text-white">
                        {crewPresenceInsight.staleMemberCount}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                        Stale signals
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xl font-black text-white">
                        {crewPresenceInsight.headingHomeCount}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">
                        Heading home
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                          Regroup plan
                        </div>

                        <div className="mt-2 text-sm font-semibold text-white">
                          {regroupPlan.available
                            ? regroupPlan.targetLabel
                            : "Awaiting location signals"}
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          regroupPlan.urgency === "Immediate"
                            ? "border-red-300/30 bg-red-400/10 text-red-200"
                            : regroupPlan.urgency === "Recommended"
                              ? "border-orange-300/30 bg-orange-400/10 text-orange-200"
                              : regroupPlan.urgency === "Low"
                                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                                : "border-white/15 bg-white/5 text-white/55"
                        }`}
                      >
                        {regroupPlan.urgency}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {regroupPlan.recommendation}
                    </p>

                    {regroupPlan.available ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-[10px] uppercase tracking-wide text-white/45">
                            Furthest member
                          </div>
                          <div className="mt-1 truncate text-sm font-black text-white">
                            {regroupPlan.furthestMemberName}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-[10px] uppercase tracking-wide text-white/45">
                            Midpoint distance
                          </div>
                          <div className="mt-1 text-sm font-black text-cyan-100">
                            {regroupPlan.furthestDistanceKm.toFixed(1)} km
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                        Recommended action
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            recommendationEngine.priority === "Critical"
                              ? "border-red-300/30 bg-red-400/10 text-red-200"
                              : recommendationEngine.priority === "High"
                                ? "border-orange-300/30 bg-orange-400/10 text-orange-200"
                                : recommendationEngine.priority === "Medium"
                                  ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                                  : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                          }`}
                        >
                          {recommendationEngine.priority}
                        </span>

                        <span className="text-xs font-bold text-white/45">
                          {recommendationEngine.confidence}% confidence
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-white">
                      {recommendationEngine.action}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-white/55">
                      {recommendationEngine.priority === "Critical"
                        ? "TwinMe detected an urgent signal pattern. Immediate direct contact and location confirmation are recommended."
                        : recommendationEngine.priority === "High"
                          ? "Crew separation is significant enough to justify an active regroup."
                          : recommendationEngine.priority === "Medium"
                            ? "TwinMe recommends a fresh check-in before relying on current crew status."
                            : "Current signals do not require intervention. Continue passive monitoring."}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          recommendationEngine.action.includes("Contact") ||
                          recommendationEngine.action.includes("Regroup") ||
                          recommendationEngine.action.includes("check-in")
                        ) {
                          void handleCrewAction("check-in");
                          return;
                        }

                        if (recommendationEngine.action.includes("arrival")) {
                          void handleCrewAction("heading-home");
                          return;
                        }

                        void handleCrewAction("check-in");
                      }}
                      className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-black transition active:scale-[0.98] ${
                        recommendationEngine.priority === "Critical"
                          ? "border-red-300/30 bg-red-400/10 text-red-100 hover:bg-red-400/15"
                          : recommendationEngine.priority === "High"
                            ? "border-orange-300/30 bg-orange-400/10 text-orange-100 hover:bg-orange-400/15"
                            : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
                      }`}
                    >
                      {recommendationEngine.action}
                    </button>
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            {/* TWINCORE_WHO_FITS_TONIGHT_UI_R13_2 */}
            <div id="who-fits-tonight" className="scroll-mt-6">
              <TwinSection
                title="Tonight's Crew"
                subtitle="TwinMe reads live Crew signals against tonight's plan"
                tone="cyan"
                defaultOpen={true}
              >
                <AnimatedCard className="mb-4 overflow-hidden rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                        👥 TwinMe Tonight Read
                      </div>

                      <h2 className="mt-2 text-xl font-black text-white">
                        Who fits the move?
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-white/60">
                        {whoFitsTonight.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          whoFitsTonight.hasMeaningfulTonightContext
                            ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                            : "border-white/15 bg-white/5 text-white/45"
                        }`}
                      >
                        {whoFitsTonight.hasMeaningfulTonightContext
                          ? `${whoFitsTonight.contextSignalCount} context signals`
                          : "Still learning"}
                      </span>

                      {whoFitsTonight.recommendedMembers.length > 0 ? (
                        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                          {whoFitsTonight.recommendedMembers.length} fit
                          {whoFitsTonight.recommendedMembers.length === 1
                            ? ""
                            : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* TWINCORE_WHO_FITS_TOP_PICK_R13_2 */}
                  {whoFitsTonight.topFit ? (
                    <div className="mt-5 rounded-[1.5rem] border border-cyan-300/20 bg-black/25 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
                            TwinMe Top Read
                          </div>

                          <div className="mt-2 text-lg font-black text-white">
                            {whoFitsTonight.topFit.name}
                          </div>

                          <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100">
                            {whoFitsTonight.topFit.confidence}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-3xl font-black text-white">
                            {whoFitsTonight.topFit.score}
                            <span className="text-base text-white/35">%</span>
                          </div>

                          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                            Tonight relevance
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-300 transition-all duration-500"
                          style={{
                            width: `${whoFitsTonight.topFit.score}%`,
                          }}
                        />
                      </div>

                      <p className="mt-4 text-sm leading-6 text-white/60">
                        {whoFitsTonight.topFit.explanation}
                      </p>

                      {whoFitsTonight.topFit.reasons.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {whoFitsTonight.topFit.reasons
                            .slice(0, 4)
                            .map((reason) => (
                              <span
                                key={`${whoFitsTonight.topFit?.id}-${reason}`}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-bold text-white/50"
                              >
                                {reason}
                              </span>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                      <div className="text-sm font-black text-white/75">
                        No Crew read yet
                      </div>

                      <p className="mt-2 text-xs leading-5 text-white/45">
                        TwinMe needs Crew activity before it can determine who
                        is relevant to tonight.
                      </p>
                    </div>
                  )}

                  {/* TWINCORE_WHO_FITS_MEMBER_READS_R13_2 */}
                  {whoFitsTonight.members.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {whoFitsTonight.members.slice(0, 4).map((member) => (
                        <div
                          key={member.id}
                          className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-white">
                                {member.name}
                              </div>

                              <div
                                className={`mt-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                                  member.confidence === "Strong Fit"
                                    ? "text-emerald-200"
                                    : member.confidence === "Possible Fit"
                                      ? "text-cyan-200"
                                      : member.confidence === "Learning"
                                        ? "text-white/40"
                                        : "text-orange-200"
                                }`}
                              >
                                {member.confidence}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-lg font-black text-white">
                                {member.score}%
                              </div>

                              <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/30">
                                relevance
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-500"
                              style={{
                                width: `${member.score}%`,
                              }}
                            />
                          </div>

                          <p className="mt-3 text-xs leading-5 text-white/50">
                            {member.explanation}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {member.isFresh ? (
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-100">
                                Live
                              </span>
                            ) : null}

                            {member.location ? (
                              <span className="max-w-[220px] truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[8px] font-bold text-white/45">
                                📍 {member.location}
                              </span>
                            ) : null}

                            {member.isHeadingHome ? (
                              <span className="rounded-full border border-orange-300/20 bg-orange-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-orange-100">
                                Heading home
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 border-t border-white/[0.07] pt-4">
                    <p className="text-[10px] leading-5 text-white/35">
                      TwinMe ranks current relevance to tonight — not
                      friendship, personality, or safety. Recommendations
                      improve as real Crew and Tonight Context signals become
                      available.
                    </p>
                  </div>
                </AnimatedCard>
              </TwinSection>
            </div>

            {/* TWINCORE_CREW_RECOMMENDATION_UI_R13_3 */}
            <div id="crew-recommendation" className="scroll-mt-6">
              <AnimatedCard className="mb-4 overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-300/[0.08] via-cyan-300/[0.05] to-black/20 p-5 shadow-[0_0_45px_rgba(167,139,250,0.10)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">
                      ✦ TwinMe • Crew Move
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100">
                        {crewRecommendation.lane}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
                        {crewRecommendation.confidence}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-black text-white">
                      {crewRecommendation.headline}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                      {crewRecommendation.body}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                      Tonight Read
                    </div>

                    <div className="mt-1 text-sm font-black text-white/80">
                      {whoFitsTonight.hasMeaningfulTonightContext
                        ? "Context Active"
                        : "Still Learning"}
                    </div>
                  </div>
                </div>

                {/* TWINCORE_CREW_RECOMMENDATION_NAMES_R13_3 */}
                {crewRecommendation.names.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {crewRecommendation.names.map((name) => (
                      <span
                        key={`crew-move-${name}`}
                        className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[9px] font-bold text-cyan-100"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 border-t border-white/[0.07] pt-5">
                  {/* TWINCORE_CREW_ACTION_BUTTON_R13_4 */}
                  <button
                    type="button"
                    onClick={executeCrewRecommendation}
                    className="flex w-full items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.10]"
                  >
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-200/60">
                        Recommended Next Move
                      </div>

                      <div className="mt-1 text-sm font-black text-white">
                        {crewRecommendation.actionLabel}
                      </div>
                    </div>

                    <span className="text-lg text-cyan-100">→</span>
                  </button>
                </div>

                <p className="mt-4 text-[9px] leading-4 text-white/30">
                  TwinMe recommends from current relevance and Tonight Context.
                  It does not infer friendship, personality, or safety.
                </p>
              </AnimatedCard>
            </div>

            {/* TWINCORE_CREW_PAYOFF_UI_R13_5 */}
            <div id="crew-payoff" className="scroll-mt-6">
              <AnimatedCard
                className={`mb-4 overflow-hidden rounded-3xl border p-5 ${
                  crewPayoff.tone === "attention"
                    ? "border-red-300/25 bg-gradient-to-br from-red-400/[0.10] via-orange-300/[0.05] to-black/20 shadow-[0_0_45px_rgba(248,113,113,0.10)]"
                    : crewPayoff.tone === "ready"
                      ? "border-emerald-300/25 bg-gradient-to-br from-emerald-300/[0.10] via-cyan-300/[0.06] to-black/20 shadow-[0_0_45px_rgba(52,211,153,0.10)]"
                      : crewPayoff.tone === "developing"
                        ? "border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.08] via-violet-300/[0.04] to-black/20 shadow-[0_0_45px_rgba(34,211,238,0.08)]"
                        : "border-violet-300/20 bg-gradient-to-br from-violet-300/[0.08] via-white/[0.03] to-black/20 shadow-[0_0_45px_rgba(167,139,250,0.08)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div
                      className={`text-[10px] font-black uppercase tracking-[0.24em] ${
                        crewPayoff.tone === "attention"
                          ? "text-red-200"
                          : crewPayoff.tone === "ready"
                            ? "text-emerald-200"
                            : crewPayoff.tone === "developing"
                              ? "text-cyan-200"
                              : "text-violet-200"
                      }`}
                    >
                      ✦ TwinMe • Tonight Payoff
                    </div>

                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                          crewPayoff.tone === "attention"
                            ? "border-red-300/25 bg-red-300/10 text-red-100"
                            : crewPayoff.tone === "ready"
                              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                              : crewPayoff.tone === "developing"
                                ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                : "border-violet-300/25 bg-violet-300/10 text-violet-100"
                        }`}
                      >
                        {crewPayoff.state}
                      </span>
                    </div>

                    <div className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                      {crewPayoff.eyebrow}
                    </div>

                    <h2 className="mt-2 text-xl font-black text-white">
                      {crewPayoff.headline}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                      {crewPayoff.body}
                    </p>
                  </div>

                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-xl ${
                      crewPayoff.tone === "attention"
                        ? "border-red-300/20 bg-red-300/10 text-red-100"
                        : crewPayoff.tone === "ready"
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                          : crewPayoff.tone === "developing"
                            ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                            : "border-violet-300/20 bg-violet-300/10 text-violet-100"
                    }`}
                    aria-hidden="true"
                  >
                    {crewPayoff.tone === "attention"
                      ? "!"
                      : crewPayoff.tone === "ready"
                        ? "✓"
                        : crewPayoff.tone === "developing"
                          ? "→"
                          : "✦"}
                  </div>
                </div>

                {/* TWINCORE_CREW_PAYOFF_NAMES_R13_5 */}
                {crewPayoff.names.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {crewPayoff.names.slice(0, 3).map((name) => (
                      <span
                        key={`crew-payoff-${name}`}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold text-white/65"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 border-t border-white/[0.07] pt-5">
                  {/* TWINCORE_CREW_PAYOFF_BUTTON_R13_5 */}
                  <button
                    type="button"
                    onClick={executeCrewPayoff}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      crewPayoff.tone === "attention"
                        ? "border-red-300/20 bg-red-300/[0.07] hover:border-red-300/35 hover:bg-red-300/[0.10]"
                        : crewPayoff.tone === "ready"
                          ? "border-emerald-300/20 bg-emerald-300/[0.07] hover:border-emerald-300/35 hover:bg-emerald-300/[0.10]"
                          : "border-cyan-300/20 bg-cyan-300/[0.07] hover:border-cyan-300/35 hover:bg-cyan-300/[0.10]"
                    }`}
                  >
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
                        Continue Tonight
                      </div>

                      <div className="mt-1 text-sm font-black text-white">
                        {crewPayoff.actionLabel}
                      </div>
                    </div>

                    <span className="text-lg text-white/70">→</span>
                  </button>
                </div>

                <p className="mt-4 text-[9px] leading-4 text-white/30">
                  TwinMe closes the loop from current Crew relevance and Tonight
                  Context. It does not invent friendship, personality, messages
                  or invitations.
                </p>
              </AnimatedCard>
            </div>

            <div id="crew-members" className="scroll-mt-6">
              <TwinSection
                title="Your Crew"
                subtitle="Presence, status, risk and individual details"
                tone={crewStats.flagged > 0 ? "red" : "cyan"}
                defaultOpen={crewStats.flagged > 0}
              >
                <div className="space-y-4">
                  {filteredRows.map((row, i) => {
                    const isSelf = row.id === currentUserId;

                    const name = isSelf
                      ? row.name || privacy.displayName || "Crew Member"
                      : row.name || `Crew ${i + 1}`;

                    const memberId = row.id || `${name}-${i}`;
                    const isExpanded = expandedMemberId === memberId;

                    const status = row.status || "active";
                    const location = row.location_name || "Unknown";
                    const tone = getRowTone(row);
                    const trusted = canSeeFull(row, privacy);

                    const heartbeat = row.heartbeat_bpm ?? 70;

                    const updatedMinutesAgo = row.updated_at
                      ? Math.max(
                          0,
                          Math.floor(
                            (Date.now() - new Date(row.updated_at).getTime()) /
                              60000,
                          ),
                        )
                      : 999;

                    let presenceScore = 20;

                    if (updatedMinutesAgo <= 5) {
                      presenceScore += 35;
                    } else if (updatedMinutesAgo <= 15) {
                      presenceScore += 22;
                    } else if (updatedMinutesAgo <= 30) {
                      presenceScore += 10;
                    }

                    if (heartbeat >= 110) {
                      presenceScore += 20;
                    } else if (heartbeat >= 90) {
                      presenceScore += 12;
                    } else if (heartbeat >= 60) {
                      presenceScore += 5;
                    }

                    if (status.toLowerCase().includes("help")) {
                      presenceScore += 25;
                    } else if (
                      status.toLowerCase().includes("moving") ||
                      status.toLowerCase().includes("heading")
                    ) {
                      presenceScore += 12;
                    } else if (status.toLowerCase().includes("safe")) {
                      presenceScore += 5;
                    }

                    if (trusted) {
                      presenceScore += 5;
                    }

                    presenceScore = Math.max(
                      0,
                      Math.min(100, Math.round(presenceScore)),
                    );

                    const presenceLabel =
                      presenceScore >= 80
                        ? "High alert"
                        : presenceScore >= 60
                          ? "Active"
                          : presenceScore >= 35
                            ? "Present"
                            : "Quiet";

                    const normalizedStatus = status.trim().toLowerCase();

                    const hasCoordinates =
                      typeof row.latitude === "number" &&
                      Number.isFinite(row.latitude) &&
                      typeof row.longitude === "number" &&
                      Number.isFinite(row.longitude);

                    const movementState =
                      normalizedStatus.includes("heading") ||
                      normalizedStatus.includes("moving") ||
                      normalizedStatus.includes("walking") ||
                      normalizedStatus.includes("driving")
                        ? "Moving"
                        : updatedMinutesAgo > 30
                          ? "Signal stale"
                          : hasCoordinates && updatedMinutesAgo <= 10
                            ? "Recently active"
                            : "Stationary";

                    const movementTone =
                      movementState === "Moving"
                        ? "emerald"
                        : movementState === "Recently active"
                          ? "cyan"
                          : movementState === "Signal stale"
                            ? "red"
                            : "white";

                    return (
                      <AnimatedCard
                        key={memberId}
                        className={`rounded-3xl border p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400/30 active:scale-[0.98] shadow-[0_0_40px_rgba(34,211,238,.08)] ${
                          tone === "red"
                            ? "border-red-400/30 bg-red-950/20"
                            : tone === "cyan"
                              ? "border-cyan-300/25 bg-cyan-950/15"
                              : tone === "orange"
                                ? "border-orange-300/25 bg-orange-950/15"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {tone === "red" ? (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                              ) : null}

                              {!trusted && privacy.trustedOnly ? (
                                <Ghost className="h-4 w-4 shrink-0 text-white/60" />
                              ) : null}

                              <span className="truncate text-base font-semibold text-white">
                                {name}
                              </span>

                              {isSelf ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                                  You
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
                              <span>{row.vibe_label || status}</span>
                              <span className="text-white/25">•</span>
                              <span>{timeAgo(row.updated_at)}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <div
                              className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                                presenceScore >= 80
                                  ? "border-red-300/25 bg-red-300/10 text-red-100"
                                  : presenceScore >= 60
                                    ? "border-orange-300/25 bg-orange-300/10 text-orange-100"
                                    : presenceScore >= 35
                                      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                      : "border-white/10 bg-white/5 text-white/55"
                              }`}
                            >
                              {presenceScore} · {presenceLabel}
                            </div>

                            <div
                              className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${
                                movementTone === "emerald"
                                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                  : movementTone === "cyan"
                                    ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                    : movementTone === "red"
                                      ? "border-red-300/25 bg-red-300/10 text-red-100"
                                      : "border-white/10 bg-white/5 text-white/55"
                              }`}
                            >
                              {movementState === "Moving"
                                ? "↗ Moving"
                                : movementState === "Recently active"
                                  ? "● Recently active"
                                  : movementState === "Signal stale"
                                    ? "⚠ Signal stale"
                                    : "— Stationary"}
                            </div>

                            <StatusChip
                              label={status}
                              tone={
                                tone === "red"
                                  ? "red"
                                  : tone === "cyan"
                                    ? "cyan"
                                    : tone === "orange"
                                      ? "orange"
                                      : "neutral"
                              }
                            />

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                                row.risk >= 75
                                  ? "border-red-400/30 bg-red-500/10 text-red-200"
                                  : row.risk >= 40
                                    ? "border-orange-300/30 bg-orange-400/10 text-orange-100"
                                    : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                              }`}
                            >
                              Risk {row.risk}%
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMemberId(isExpanded ? null : memberId)
                          }
                          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-xs font-semibold text-white/70 transition hover:bg-white/[0.07]"
                          aria-expanded={isExpanded}
                        >
                          <span>
                            {isExpanded ? "Hide details" : "View details"}
                          </span>

                          <span
                            className={`transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          >
                            ▾
                          </span>
                        </button>

                        {isExpanded ? (
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/65">
                              <MapPin className="h-4 w-4 shrink-0 text-cyan-300" />
                              <span className="truncate">{location}</span>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                                Distance From Crew Core
                              </div>

                              <div className="mt-1 text-sm font-semibold text-white/80">
                                {row.distanceKm !== null
                                  ? row.distanceKm < 0.1
                                    ? "At crew core"
                                    : `${row.distanceKm.toFixed(1)} km away`
                                  : "Location unavailable"}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <MiniInfo
                                icon={Activity}
                                label="Heartbeat"
                                value={
                                  trusted || !privacy.trustedOnly
                                    ? row.heartbeat_bpm
                                      ? `${row.heartbeat_bpm} BPM`
                                      : "Linked"
                                    : "Masked"
                                }
                              />

                              <MiniInfo
                                icon={Users}
                                label="Vibe"
                                value={row.vibe_label || "No vibe"}
                              />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/50">
                              Last updated {timeAgo(row.updated_at)}
                            </div>
                          </div>
                        ) : null}
                      </AnimatedCard>
                    );
                  })}
                </div>
              </TwinSection>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center sm:min-h-[105px] sm:p-4">
      <div className="mb-2 flex items-center justify-center">
        <Icon className="h-4 w-4 text-white/70" />
      </div>

      <div className="text-xl font-semibold text-white sm:text-2xl">
        {value}
      </div>

      <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/50">
        {label}
      </div>
    </div>
  );
}

function MiniInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <div className="truncate text-sm font-medium text-white/85">{value}</div>
    </div>
  );
}
