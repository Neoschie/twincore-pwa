"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
};

type StoredProfile = {
  displayName?: string;
};

type CrewMemberLookupRow = {
  id: number;
};

const PROFILE_STORAGE_KEY = "twincore_profile";

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

  function getDisplayName() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
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
      const acceptedLocal = acceptLocalInvite(code);
      const displayName = getDisplayName();

      if (supabase) {
        const { data: existingMember, error: existingMemberError } =
          await supabase
            .from("crew_members")
            .select("id")
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

        const nextUseCount = memberAlreadyExists ? useCount : useCount + 1;
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

        setJoined(true);
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

        setJoined(true);
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

  const expired = invite ? isInviteExpired(invite.expiresAt) : false;
  const unavailable = isInviteUnavailable(invite);
  const maxUses = invite?.maxUses ?? 50;
  const useCount = invite?.useCount ?? 0;
  const remainingSlots = Math.max(maxUses - useCount, 0);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            TwinCore Invite
          </div>
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
              <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
              <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
              <div className="h-10 w-32 animate-pulse rounded-xl bg-white/10" />
            </div>
          ) : invite ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">
                  Invite Code
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-wide">
                  {invite.code}
                </div>

                <div className="mt-3 grid gap-3 text-sm text-white/75 sm:grid-cols-2">
                  <div>
                    <span className="text-white/45">Inviter:</span>{" "}
                    <span className="text-white">{invite.inviterName}</span>
                  </div>
                  <div>
                    <span className="text-white/45">Crew:</span>{" "}
                    <span className="text-white">{invite.crewName}</span>
                  </div>
                  <div>
                    <span className="text-white/45">Status:</span>{" "}
                    <span className="text-white capitalize">
                      {expired ? "expired" : unavailable ? "full" : invite.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/45">Created:</span>{" "}
                    <span className="text-white">
                      {new Date(invite.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/45">Joined:</span>{" "}
                    <span className="text-white">
                      {useCount} / {maxUses}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/45">Slots left:</span>{" "}
                    <span className="text-white">{remainingSlots}</span>
                  </div>
                </div>
              </div>

              {joined ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
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
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joining ? "Joining..." : "Join TwinCore"}
                </button>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {copied ? "Invite link copied" : "Copy invite link"}
                </button>

                <Link
                  href="/join"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Enter another code
                </Link>

                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Back home
                </Link>
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
    </main>
  );
}