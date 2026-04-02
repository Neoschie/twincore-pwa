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

export default function InviteCodePage() {
  const params = useParams<{ code: string }>();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code ?? "";
  const code = useMemo(() => normalizeInviteCode(rawCode), [rawCode]);

  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      setLoading(true);

      const localInvite = getInviteByCode(code);
      if (localInvite && active) {
        setInvite(localInvite);
      }

      if (supabase) {
        const { data } = await supabase
          .from("crew_invites")
          .select("*")
          .eq("code", code)
          .maybeSingle();

        if (data && active) {
          const remoteInvite: InviteRecord = {
            code: data.code,
            inviterName: data.inviter_name ?? "Neo",
            crewName: data.crew_name ?? "TwinCore Crew",
            createdAt: data.created_at ?? new Date().toISOString(),
            acceptedAt: data.accepted_at ?? undefined,
            expiresAt: data.expires_at ?? undefined,
            status: (data.status ?? "pending") as InviteRecord["status"],
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

  async function handleJoin() {
    if (!invite) return;

    if (isInviteExpired(invite.expiresAt)) {
      setStatusMessage("This invite has expired.");
      return;
    }

    setJoining(true);
    setStatusMessage("");

    try {
      const acceptedLocal = acceptLocalInvite(code);

      if (supabase) {
        await supabase
          .from("crew_invites")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("code", code);
      }

      setInvite((prev) =>
        prev
          ? {
              ...prev,
              status: "accepted",
              acceptedAt: new Date().toISOString(),
            }
          : acceptedLocal,
      );

      setJoined(true);
      setStatusMessage("You joined successfully. Welcome to TwinCore.");
    } catch {
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
            Open your TwinCore invite, join the crew, and step into the full experience.
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
                <div className="mt-2 text-2xl font-semibold tracking-wide">{invite.code}</div>
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
                    <span className="text-white capitalize">{expired ? "expired" : invite.status}</span>
                  </div>
                  <div>
                    <span className="text-white/45">Created:</span>{" "}
                    <span className="text-white">
                      {new Date(invite.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {joined || invite.status === "accepted" ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  You’re in. The invite has already been accepted.
                </div>
              ) : expired ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
                  This invite is no longer active.
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

              {statusMessage ? (
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