"use client";

import QRCode from "qrcode";
import Link from "next/link";
import {
  Clipboard,
  Share2,
  Camera,
  Home,
  Users,
  ShieldCheck,
  Clock3,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import posthog from "posthog-js";
import {
  acceptLocalInvite,
  buildInviteLink,
  getInviteByCode,
  isInviteExpired,
  normalizeInviteCode,
  type InviteRecord,
} from "@/lib/invite-system";

type RemoteInvite = InviteRecord & {
  maxUses?: number;
  useCount?: number;
  isActive?: boolean;
  inviterAvatarUrl?: string | null;
};

type StoredProfile = {
  displayName?: string;
};

type CrewMemberLookupRow = {
  id: number;
};

const getProfileStorageKey = (userId: string) =>
  `twincore_profile_${userId}`;

function getReadableError(error: unknown) {
  if (!error) {
    return {
      message: "Unknown error",
      details: null as string | null,
      hint: null as string | null,
      code: null as string | null,
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      details: null,
      hint: null,
      code: null,
    };
  }

  if (typeof error === "object") {
    const maybeError = error as {
      message?: string;
      details?: string | null;
      hint?: string | null;
      code?: string | null;
    };

    return {
      message: maybeError.message || "Unknown error",
      details: maybeError.details ?? null,
      hint: maybeError.hint ?? null,
      code: maybeError.code ?? null,
    };
  }

  return {
    message: "Unknown error",
    details: null,
    hint: null,
    code: null,
  };
}

function toRemoteInvite(
  invite: InviteRecord,
  overrides?: Partial<RemoteInvite>
): RemoteInvite {
  return {
    ...invite,
    maxUses: overrides?.maxUses ?? 50,
    useCount: overrides?.useCount ?? 0,
    isActive: overrides?.isActive ?? true,
    ...overrides,
  };
}

export default function InviteCodePage() {
  const params = useParams<{ code: string }>();
  const rawCode = Array.isArray(params?.code)
    ? params.code[0]
    : params?.code ?? "";
  const code = useMemo(() => normalizeInviteCode(rawCode), [rawCode]);

  const [invite, setInvite] = useState<RemoteInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
   const [qrImage, setQrImage] = useState("");
   const [isTeaserPlaying, setIsTeaserPlaying] = useState(false);
const [teaserProgress, setTeaserProgress] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      setLoading(true);
      setStatusMessage("");

      const localInvite = getInviteByCode(code);
      if (localInvite && active) {
        setInvite(toRemoteInvite(localInvite));
      }

      if (supabase) {
        const { data, error } = await supabase
          .from("crew_invites")
          .select("*")
          .eq("code", code)
          .maybeSingle();

        if (error) {
          const readable = getReadableError(error);
          console.log("INVITE LOOKUP MESSAGE:", readable.message);
          console.log("INVITE LOOKUP DETAILS:", readable.details);
          console.log("INVITE LOOKUP HINT:", readable.hint);
          console.log("INVITE LOOKUP CODE:", readable.code);
        }

        if (!error && data && active) {
          const remoteInvite: RemoteInvite = {
            code: data.code,
            inviterName: data.inviter_name ?? "Neo",
            inviterAvatarUrl: data.inviter_avatar_url ?? null,
            crewName: data.crew_name ?? "TwinCore Crew",
            createdAt: data.created_at ?? new Date().toISOString(),
            acceptedAt: data.accepted_at ?? undefined,
            expiresAt: data.expires_at ?? undefined,
            status: (data.status ?? "pending") as InviteRecord["status"],
            maxUses: typeof data.max_uses === "number" ? data.max_uses : 50,
            useCount: typeof data.use_count === "number" ? data.use_count : 0,
            isActive:
              typeof data.is_active === "boolean" ? data.is_active : true,
          };

          setInvite(remoteInvite);
        }
      }

      if (active) {
        setLoading(false);
      }
    }

    loadInvite();

    return () => {
      active = false;
    };
  }, [code]);

useEffect(() => {
  if (!code) return;

  async function generateQr() {
    try {
      const link = buildInviteLink(window.location.origin, code);
      const image = await QRCode.toDataURL(link, {
        width: 512,
        margin: 2,
      });

      setQrImage(image);
    } catch {
      setQrImage("");
    }
  }

  generateQr();
}, [code]);

  function getDisplayName(userId: string) {
  try {
    const raw = localStorage.getItem(getProfileStorageKey(userId));
    if (!raw) return "Guest";

    const parsed = JSON.parse(raw) as StoredProfile;
    return parsed.displayName?.trim() || "Guest";
  } catch {
    return "Guest";
  }
}

  function isInviteUnavailable(currentInvite: RemoteInvite | null) {
    if (!currentInvite) return true;
    if (isInviteExpired(currentInvite.expiresAt)) return true;
    if (currentInvite.isActive === false) return true;

    const maxUses = currentInvite.maxUses ?? 50;
    const useCount = currentInvite.useCount ?? 0;

    return useCount >= maxUses;
  }

  async function handleJoin() {
    if (!invite) return;

    if (isInviteExpired(invite.expiresAt)) {
      setStatusMessage("This invite has expired.");
      return;
    }

    if (invite.isActive === false) {
      setStatusMessage("This invite is no longer active.");
      return;
    }

    const maxUses = invite.maxUses ?? 50;
    const useCount = invite.useCount ?? 0;

    if (useCount >= maxUses) {
      setStatusMessage("This invite has reached its join limit.");
      return;
    }

    setJoining(true);
    setStatusMessage("");

    try {
    
      const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  setStatusMessage("Please sign in first.");
  setJoining(false);
  return;
}

const acceptedLocal = acceptLocalInvite(code, user.id);
const displayName = getDisplayName(user.id);

      if (supabase) {
        const { data: existingMember, error: existingMemberError } =
  await supabase
    .from("crew_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("crew_owner", invite.inviterName)
    .eq("member_name", displayName)
    .maybeSingle<CrewMemberLookupRow>();

        if (existingMemberError) {
          const readable = getReadableError(existingMemberError);

          console.log("LOOKUP MESSAGE:", readable.message);
          console.log("LOOKUP DETAILS:", readable.details);
          console.log("LOOKUP HINT:", readable.hint);
          console.log("LOOKUP CODE:", readable.code);

          setStatusMessage(
            `Lookup error: ${readable.message || "Unable to check crew membership."}`
          );
          setJoining(false);
          return;
        }

        let memberAlreadyExists = Boolean(existingMember);

        if (!memberAlreadyExists) {
          const { error: memberInsertError } = await supabase
            .from("crew_members")
            .insert({
        user_id: user.id,
        crew_owner: invite.inviterName,
        member_name: displayName,
        });

          if (memberInsertError) {
            const readable = getReadableError(memberInsertError);

            console.log("INSERT MESSAGE:", readable.message);
            console.log("INSERT DETAILS:", readable.details);
            console.log("INSERT HINT:", readable.hint);
            console.log("INSERT CODE:", readable.code);

            if (readable.code === "23505") {
              memberAlreadyExists = true;
            } else {
              setStatusMessage(
                `Join error: ${readable.message || "Unable to join crew."}`
              );
              setJoining(false);
              return;
            }
          }
        }

        const nextUseCount = invite.status === "accepted" ? useCount : useCount + 1;
        const nextIsActive = nextUseCount < maxUses;
        const acceptedAt = new Date().toISOString();

        const { error: inviteUpdateError } = await supabase
  .from("crew_invites")
  .update({
    use_count: nextUseCount,
    is_active: nextIsActive,
    status: "accepted",
    accepted_at: acceptedAt,
  })
  .eq("code", code);

        if (inviteUpdateError) {
          const readable = getReadableError(inviteUpdateError);

          console.log("INVITE UPDATE MESSAGE:", readable.message);
          console.log("INVITE UPDATE DETAILS:", readable.details);
          console.log("INVITE UPDATE HINT:", readable.hint);
          console.log("INVITE UPDATE CODE:", readable.code);

          setStatusMessage(
            `Invite update error: ${readable.message || "Unable to update invite."}`
          );
          setJoining(false);
          return;
        }

        setInvite((prev): RemoteInvite => {
          if (prev) {
            return {
              ...prev,
              status: "accepted",
              acceptedAt,
              useCount: nextUseCount,
              isActive: nextIsActive,
            };
          }

          if (acceptedLocal) {
            return toRemoteInvite(acceptedLocal, {
              status: "accepted",
              acceptedAt,
              maxUses,
              useCount: nextUseCount,
              isActive: nextIsActive,
            });
          }

          return {
            code,
            inviterName: invite.inviterName,
            crewName: invite.crewName,
            createdAt: invite.createdAt,
            expiresAt: invite.expiresAt,
            status: "accepted",
            acceptedAt,
            maxUses,
            useCount: nextUseCount,
            isActive: nextIsActive,
          };
        });

        if (!memberAlreadyExists) {
          posthog.capture("crew_invite_accepted", {
            crew_name: invite.crewName,
            inviter_name: invite.inviterName,
          });
        }
        setJoined(true);
        setShowWelcome(true);
setTimeout(() => setShowWelcome(false), 3500);
        setStatusMessage(
          memberAlreadyExists
            ? "You’re already part of this crew."
            : "You joined successfully. Welcome to TwinCore."
        );
      } else {
        const acceptedAt = new Date().toISOString();

        setInvite((prev): RemoteInvite | null => {
          if (prev) {
            return {
              ...prev,
              status: "accepted",
              acceptedAt,
            };
          }

          if (acceptedLocal) {
            return toRemoteInvite(acceptedLocal, {
              status: "accepted",
              acceptedAt,
            });
          }

          return null;
        });

        posthog.capture("crew_invite_accepted", {
          crew_name: invite.crewName,
          inviter_name: invite.inviterName,
        });
        setJoined(true);
        setShowWelcome(true);
setTimeout(() => setShowWelcome(false), 3500);
        setStatusMessage("You joined successfully. Welcome to TwinCore.");
      }
    } catch (error) {
      const readable = getReadableError(error);

      console.log("JOIN FLOW MESSAGE:", readable.message);
      console.log("JOIN FLOW DETAILS:", readable.details);
      console.log("JOIN FLOW HINT:", readable.hint);
      console.log("JOIN FLOW CODE:", readable.code);

      setStatusMessage("Something went wrong while joining. Try again.");
    } finally {
      setJoining(false);
    }
  }

  async function handleCopyLink() {
    try {
      const link = buildInviteLink(window.location.origin, code);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

async function handleShareInvite() {
  try {
    const link = buildInviteLink(window.location.origin, code);

    if (navigator.share) {
      await navigator.share({
        title: "Join my TwinCore Crew",
        text: `Join ${invite?.crewName ?? "my TwinCore crew"}.`,
        url: link,
      });
    } else {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  } catch {}
}

function handleInviteTeaser() {
  const audio = new Audio("/audio/twincore-invite-teaser.mp3");
  audio.volume = 0.55;

  setIsTeaserPlaying(true);
  setTeaserProgress(0);

  const maxDuration = 12;
  const startTime = Date.now();

  const interval = window.setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min((elapsed / maxDuration) * 100, 100);

    setTeaserProgress(progress);

    if (elapsed >= maxDuration - 1) {
  audio.volume = Math.max(0.05, 0.55 * (maxDuration - elapsed));
}

if (elapsed >= maxDuration) {
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.55;
  window.clearInterval(interval);
  setIsTeaserPlaying(false);
  setTeaserProgress(100);
}
  }, 150);

  audio.play().catch(() => {
    window.clearInterval(interval);
    setIsTeaserPlaying(false);
    setTeaserProgress(0);
  });

  audio.onended = () => {
    window.clearInterval(interval);
    setIsTeaserPlaying(false);
    setTeaserProgress(100);
  };
}

async function handleOpenQr() {
  try {
    const link = buildInviteLink(window.location.origin, code);
    const image = await QRCode.toDataURL(link, {
      width: 512,
      margin: 2,
    });

    setQrImage(image);
    setShowQr(true);
  } catch {
    setShowQr(true);
  }
}

function formatCreatedTime(dateString: string) {
  const created = new Date(dateString);
  const now = new Date();

  const diff = Math.floor(
    (now.getTime() - created.getTime()) / 1000
  );

  if (diff < 60) return "just now";

  if (diff < 3600)
    return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) > 1 ? "s" : ""} ago`;

  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? "s" : ""} ago`;

  if (diff < 172800)
    return "yesterday";

  if (diff < 604800)
    return `${Math.floor(diff / 86400)} days ago`;

  return created.toLocaleDateString();
}

function formatCreatedTime(dateString: string) {
  const created = new Date(dateString);
  const now = new Date();

  const diff = Math.floor(
    (now.getTime() - created.getTime()) / 1000
  );

  if (diff < 60) return "just now";

  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  }

  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  if (diff < 172800) return "yesterday";

  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} days ago`;
  }

  return created.toLocaleDateString();
}

function formatCreatedTime(dateString: string) {
  const created = new Date(dateString);
  const now = new Date();

  const diff = Math.floor((now.getTime() - created.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (diff < 172800) return "yesterday";
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} days ago`;
  }

  return created.toLocaleDateString();
}

  const expired = invite ? isInviteExpired(invite.expiresAt) : false;
  const unavailable = isInviteUnavailable(invite);
  const maxUses = invite?.maxUses ?? 50;
  const useCount = invite?.useCount ?? 0;
  const remainingSlots = Math.max(maxUses - useCount, 0);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="mb-6 flex items-center justify-between gap-3">
  <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
    TwinCore Invite
  </div>

  <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
    🛡 Secure Invite
  </div>
</div>

<div className="mb-6"></div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Join the crew
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">
            Open your TwinCore invite, join the crew, and step into the full
            experience.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-5 w-40 animate-[pulse_0.55s_infinite] rounded bg-white/10" />
              <div className="h-16 animate-[pulse_0.75s_infinite] rounded-2xl bg-white/10" />
              <div className="h-10 w-32 animate-[pulse_0.65s_infinite] rounded-xl bg-white/10" />
            </div>
   ) : invite ? (
  <div className="space-y-6">
    <div className="text-center">
      <div className="relative mx-auto mb-5 flex h-32 w-full max-w-3xl items-center justify-center">
       <div className="absolute left-0 top-1/2 hidden w-[49.5%] -translate-y-1/2 justify-end sm:flex">
  <svg
    width="280"
    height="80"
    viewBox="0 0 280 80"
    className={`transition-all duration-500
${
isTeaserPlaying
  ? "brightness-125 animate-pulse drop-shadow-[0_0_35px_rgba(217,70,239,1)]"
: "drop-shadow-[0_0_18px_rgba(217,70,239,.7)]"
}`}
  >
    <path
      d="M0 40 H70 C78 40 82 28 90 28 C100 28 102 52 112 52 C120 52 124 40 132 40 H150 L160 10 L172 70 L184 40 H205 C213 40 217 28 225 28 C235 28 237 52 247 52 C255 52 260 40 280 40"
      stroke="#d946ef"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>

<div className="absolute right-0 top-1/2 hidden w-[49.5%] -translate-y-1/2 justify-start sm:flex">
  <svg
    width="280"
    height="80"
    viewBox="0 0 280 80"
    className={`transition-all duration-500 ${
  isTeaserPlaying
  ? "brightness-125 animate-pulse drop-shadow-[0_0_40px_rgba(34,211,238,1)]"
    : "drop-shadow-[0_0_28px_rgba(34,211,238,0.95)]"
}`}
  >
    <path
      d="M0 40 H35 C55 40 60 28 68 28 C78 28 80 52 90 52 C98 52 102 40 110 40 H128 L138 10 L150 70 L162 40 H180 C188 40 192 28 200 28 C210 28 212 52 222 52 C230 52 234 40 242 40 H280"
      stroke="#22d3ee"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div> 

        <div
          className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-fuchsia-400/60 bg-[radial-gradient(circle,#7c3aed55,#020617)] shadow-[0_0_90px_rgba(217,70,239,0.85)] ${
          isTeaserPlaying
  ? "brightness-125 animate-[pulse_1.5s_ease-in-out_infinite]"
  : "twin-heartbeat"
          }`}
        >
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-cyan-300/40 bg-black/40 text-3xl font-bold text-white">
            {invite.inviterAvatarUrl ? (
              <img
                src={invite.inviterAvatarUrl}
                alt={`{invite.inviterName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              invite.inviterName?.slice(0, 1).toUpperCase() || "T"
            )}
          </div>

          <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-[#050816] bg-emerald-400" />
        </div>
      </div>

      <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
        You&apos;ve Been{" "}
        <span className="bg-gradient-to-r from-fuchsia-300 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
          Invited
        </span>{" "}
        🎉
      </h1>

      <p className="mt-3 text-base text-white/70">
        <span className="font-semibold text-cyan-300">
          {invite.inviterName}
        </span>{" "}
        <span className="text-cyan-300">✓</span> invited you to join
      </p>

      <h2 className="mt-2 text-3xl font-bold text-white">
        {invite.crewName}
      </h2>

      <p className="mt-3 text-sm text-white/55">
        Connect through Party Mode • Crew • Spots • TwinMe
      </p>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="min-h-[240px] rounded-3xl border border-fuchsia-400/30 bg-black/20 p-6 shadow-[0_0_55px_rgba(217,70,239,0.25)]">
        <div className="text-lg font-bold text-fuchsia-300">
          ♪ TwinCore Signature™
        </div>

        <div className="mt-5 space-y-3 text-sm text-white/70">
          <div>🎵 Hey TwinMe...</div>
          <div>🎵 Where&apos;s my crew?</div>
          <div>🎵 Let&apos;s get lit with Party Mode...</div>
        </div>

<div className="mt-5 flex justify-center items-end gap-2">

  <div className="h-4  w-2 rounded-full bg-fuchsia-400 animate-[pulse_0.45s_ease-in-out_infinite]" />

  <div className="h-12 w-2 rounded-full bg-cyan-300 animate-[pulse_0.75s_ease-in-out_infinite]" />

  <div className="h-7  w-2 rounded-full bg-pink-400 animate-[pulse_0.55s_ease-in-out_infinite]" />

  <div className="h-16 w-2 rounded-full bg-fuchsia-300 animate-[pulse_0.90s_ease-in-out_infinite]" />

  <div className="h-9  w-2 rounded-full bg-cyan-300 animate-[pulse_0.60s_ease-in-out_infinite]" />

  <div className="h-13 w-2 rounded-full bg-violet-400 animate-[pulse_0.82s_ease-in-out_infinite]" />

  <div className="h-6  w-2 rounded-full bg-fuchsia-400 animate-[pulse_0.50s_ease-in-out_infinite]" />

</div>

        <button
          type="button"
          onClick={handleInviteTeaser}
          disabled={isTeaserPlaying}
          className="mt-5 rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-600 disabled:opacity-60"
        >
          {isTeaserPlaying ? "⏸ Playing" : "🎵 Hear TwinCore DNA"}
        </button>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
         <div
className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 transition-all duration-1000 ease-out" 
            style={{ width: `${teaserProgress}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-white/35">
          <span>0:00</span>
          <span>0:12</span>
        </div>
      </div>

      <div
  className={`min-h-[260px] rounded-3xl border border-fuchsia-400/30 bg-black/20 p-6 text-center transition-all duration-700 shadow-[0_0_70px_rgba(217,70,239,0.22)]
  ${
    isTeaserPlaying
      ? "shadow-[0_0_45px_rgba(217,70,239,.35)]"
      : ""
  }`}
>
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-200">
          Scan to Join
        </div>

        <button
          type="button"
          onClick={handleOpenQr}
          className="relative mx-auto mt-5 flex h-52 w-52 items-center justify-center rounded-3xl border border-fuchsia-300/50 bg-white p-3 shadow-[0_0_28px_rgba(217,70,239,0.35)]"
        >
          {qrImage ? (
            <div className="relative">
              ${
isTeaserPlaying
? "animate-pulse"
: ""
}
              <img
                src={qrImage}
                alt="TwinCore invite QR code"
                className="h-44 w-44 rounded-2xl"
              />
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-[#090A14] text-lg font-black text-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.95)]">
                TC
              </div>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-900">QR</div>
          )}
        </button>

        <p className="mt-4 text-sm text-white/60">
          Scan with your camera to join{" "}
          <span className="font-semibold text-cyan-300">
            {invite.crewName}
          </span>
        </p>
      </div>
    </div>

    <div className="rounded-[2rem] border border-fuchsia-400/30 bg-black/30 p-5 shadow-[0_0_90px_rgba(217,70,239,0.85)]">
  <div className="text-center">
    <div className="text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-200">
      Invite Code
    </div>

    <div className="mt-4 flex items-center justify-center gap-5">
      <svg
        width="115"
        height="40"
        viewBox="0 0 115 24"
        className={`hidden transition-all duration-500 sm:block ${
  isTeaserPlaying
    ? "brightness-125 animate-pulse drop-shadow-[0_0_34px_rgba(217,70,239,1)]"
    : "drop-shadow-[0_0_14px_rgba(217,70,239,.95)]"
}`}
      >
        <path
          d="M0 17 H28 C34 17 36 10 41 10 C47 10 48 24 54 24 C60 24 62 17 68 17 H76 L82 5 L89 29 L96 17 H115"
          stroke="#d946ef"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div
        className={`twin-heartbeat text- [56px]
 font-black tracking-tight leading-none whitespace-nowrap text-white drop-shadow-[0_0_40px_rgba(236,72,153,.95)] transition-all duration-300 sm:text-4xl         
        ${
isTeaserPlaying
? "brightness-125"
: ""
  }`}
      >
        {invite.code}
      </div>

      <svg
        width="140"
        height="40"
        viewBox="0 0 115 34"
        className={`hidden transition-all duration-500 sm:block ${
  isTeaserPlaying
    ? "brightness-125 animate-pulse drop-shadow-[0_0_40px_rgba(34,211,238,1)]"
    : "drop-shadow-[0_0_30px_rgba(34,211,238,.95)]"
}`}
      >
        <path
          d="M0 17 H19 L25 17 L31 5 L38 29 L45 17 H58 C64 17 66 10 72 10 C79 10 80 24 87 24 C94 24 96 17 102 17 H115"
          stroke="#22d3ee"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </div>
      <div className="mt-6 grid gap-5 text-sm text-white/75 sm:grid-cols-2">
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center gap-3">
      <UserRound className="h-8 w-8 text-fuchsia-400" />
      <div>
        <div className="text-white/45">Invited by</div>
        <div className="mt-1 text-lg font-semibold text-white">
          {invite.inviterName} <span className="text-cyan-300">✓</span>
        </div>
      </div>
    </div>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center gap-3">
      <Users className="h-8 w-8 text-fuchsia-400" />
      <div>
        <div className="text-white/45">Crew</div>
        <div className="mt-1 text-lg font-semibold text-white">
          {invite.crewName}
        </div>
      </div>
    </div>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center gap-3">
      <ShieldCheck className="h-8 w-8 text-fuchsia-400" />
      <div>
        <div className="text-white/45">Status</div>
        <div className="mt-2 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
          {expired ? "Expired" : unavailable ? "Full" : invite.status}
        </div>
      </div>
    </div>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center gap-3">
      <Clock3 className="h-8 w-8 text-fuchsia-400" />
      <div>
        <div className="text-white/45">Invited</div>
        <div className="mt-1 text-lg font-semibold text-white">
          {formatCreatedTime(invite.createdAt)}
        </div>
      </div>
    </div>
  </div>
</div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-white/60">Members</span>
          <span className="text-white/80">
            {useCount} of {maxUses} joined
          </span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
    
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400"
            style={{
              width: `${Math.min(
                (useCount / Math.max(maxUses, 1)) * 100,
                100
              )}%`,
            }}
          />
        </div>

        <div className="mt-2 text-right text-xs text-white/45">
          {remainingSlots} slots left
        </div>
      </div>
    </div>
        
       {joined ? (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400 animate-pulse/10 p-4 text-sm text-emerald-100">
        {statusMessage || "You’re in. Welcome to the TwinCore crew."}
      </div>
    ) : expired ? (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
        This invite is no longer active.
      </div>
    ) : unavailable ? (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        This invite has reached its member limit.
      </div>
    ) : (
      <button
        type="button"
        onClick={handleJoin}
        disabled={joining}
        className="relative overflow-hidden flex min-h-14 w-full items-center justify-center rounded-3xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-5 py-4 text-base font-bold text-white shadow-[0_0_28px_rgba(217,70,239,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
      >
   {isTeaserPlaying && (
  <span className="pointer-events-none absolute inset-0 rounded-3xl bg-white/10 animate-pulse" />
)}

        <span className="relative z-10">

{joining
? "Joining..."
: "Join TwinCore Crew"}

</span>

</button>
)}

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
  
  <button
    type="button"
    onClick={handleCopyLink}
    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
  >
    <Clipboard className="mr-2 h-4 w-4" />
    {copied ? "Copied ✓" : "Copy Link"}
  </button>

      <button
        type="button"
        onClick={handleShareInvite}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share Invite
      </button>

      <button
        type="button"
        onClick={handleOpenQr}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <Camera className="mr-2 h-4 w-4" />
        QR Code
      </button>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Link
        href="/join"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Enter New Code
      </Link>

      <Link
        href="/"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        <Home className="mr-2 h-4 w-4" />
        Back Home
      </Link>
    </div>

    <div className="text-center text-xs text-white/35">
      Secure • Private • Trusted
    </div>

    {!joined && statusMessage ? (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
        {statusMessage}
      </div>
    ) : null}
  </div>
              
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                This invite code was not found.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/join"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Try another code
                </Link>

                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Back home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

{showQr ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur">
    <div className="w-full max-w-sm rounded-3xl border border-fuchsia-400/20 bg-[#070A14] p-6 text-center shadow-[0_0_65px_rgba(217,70,239,0.25)]">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-200">
        Scan to Join TwinCore Crew
      </div>

      <div className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-3xl border border-white/10 bg-white p-4 text-center text-sm font-bold text-slate-900">
        {qrImage ? (
  <img
    src={qrImage}
    alt="TwinCore invite QR code"
    className="h-60 w-60 rounded-2xl"
  />
) : (
  <div className="text-sm font-bold text-slate-900">
    QR unavailable
  </div>
)}
      </div>

      <p className="mt-4 text-sm text-white/60">
        QR invite sharing will let people scan your TwinCore crew invite instantly.
      </p>

      <button
        type="button"
        onClick={() => setShowQr(false)}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-600"
      >
        Close
      </button>
    </div>
  </div>
) : null}

{showWelcome ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur">
    <div className="w-full max-w-sm rounded-3xl border border-fuchsia-400/30 bg-[#070A14] p-6 text-center shadow-[0_0_50px_rgba(217,70,239,0.35)]">
      <div className="mx-auto mb-4 flex h-20 w-20 twin-heartbeat items-center justify-center rounded-full bg-fuchsia-500/20 text-4xl">
        🎉
      </div>

      <h2 className="text-3xl font-black text-white">
        Welcome to TwinCore
      </h2>

      <div className="mt-5 space-y-3 text-sm text-white/75">
        <div>🫀 Party Mode Ready</div>
        <div>🩵 Crew Connected</div>
        <div>📍 Spots Activated</div>
        <div>🧠 TwinMe Ready</div>
      </div>
    </div>
  </div>
) : null}

    </main>
  );
}