"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft,
  Check,
  Clipboard,
  ExternalLink,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  buildInviteLink,
  generateInviteCode,
  normalizeInviteCode,
} from "@/lib/invite-system";
import {
  getActiveCrew,
} from "@/lib/crew-system";
import { supabase } from "@/lib/supabase/client";
import { getSharedProfile } from "@/lib/shared-profile";

type StoredProfile = {
  displayName?: string;
  photoUrl?: string;
};

const getProfileStorageKey = (userId: string) =>
  `twincore_profile_${userId}`;

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inviteCode, setInviteCode] = useState("");
  const [inviterName, setInviterName] = useState("");
  const [inviterAvatarUrl, setInviterAvatarUrl] = useState("");
  const [crewName, setCrewName] = useState("TwinCore Crew");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sharedCode = normalizeInviteCode(searchParams.get("code") || "");

    if (sharedCode) {
      setInviteCode(sharedCode);
    }

    async function loadInviterProfileAndCrew() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      let resolvedDisplayName = "";
      let resolvedAvatarUrl = "";

      try {
        const sharedProfile = await getSharedProfile(user.id);

        if (sharedProfile?.display_name?.trim()) {
          resolvedDisplayName = sharedProfile.display_name.trim();
          setInviterName(resolvedDisplayName);
        }

        if (sharedProfile?.photo_url?.trim()) {
          resolvedAvatarUrl = sharedProfile.photo_url.trim();
          setInviterAvatarUrl(resolvedAvatarUrl);
        }
      } catch (error) {
        console.error("JOIN SHARED PROFILE LOOKUP ERROR:", error);
      }

      const raw = localStorage.getItem(getProfileStorageKey(user.id));

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StoredProfile;

          if (!resolvedDisplayName && parsed.displayName?.trim()) {
            resolvedDisplayName = parsed.displayName.trim();
            setInviterName(resolvedDisplayName);
          }

          if (!resolvedAvatarUrl && parsed.photoUrl?.trim()) {
            resolvedAvatarUrl = parsed.photoUrl.trim();
            setInviterAvatarUrl(resolvedAvatarUrl);
          }
        } catch {
          // Keep safe defaults when saved profile data is invalid.
        }
      }

      const activeCrew = await getActiveCrew(user.id);

      if (!activeCrew) return;

      if (sharedCode) {
        return;
      }

      const inviteLink = buildInviteLink(window.location.origin, activeCrew.inviteCode);

      setInviterName(activeCrew.ownerName || resolvedDisplayName);
      setCrewName(activeCrew.name);
      setInviteCode(activeCrew.inviteCode);
      setCreatedLink(inviteLink);
      setStatusMessage(
        `${activeCrew.name} is ready to share.`,
      );

      if (activeCrew.ownerId === user.id) {
        try {
          const { data: existingInvite, error: lookupError } =
            await supabase
              .from("crew_invites")
              .select("id")
              .eq("user_id", user.id)
              .eq("code", activeCrew.inviteCode)
              .maybeSingle();

          if (lookupError) {
            console.error("ACTIVE CREW INVITE LOOKUP ERROR:", lookupError);
            return;
          }

          if (!existingInvite) {
            const { error: insertError } = await supabase
              .from("crew_invites")
              .insert({
                user_id: user.id,
                crew_id: activeCrew.id,
                crew_owner_id: activeCrew.ownerId,
                code: activeCrew.inviteCode,
                inviter_name:
                  activeCrew.ownerName || resolvedDisplayName,
                inviter_avatar_url: resolvedAvatarUrl || null,
                crew_name: activeCrew.name,
                status: "active",
                created_at: activeCrew.createdAt,
              });

            if (insertError) {
              console.error(
                "ACTIVE CREW INVITE INSERT ERROR:",
                insertError,
              );
            }
          }
        } catch (error) {
          console.error("ACTIVE CREW INVITE SYNC ERROR:", error);
        }
      }
    }

    void loadInviterProfileAndCrew();
  }, []);

  const cleanedCode = useMemo(
    () => normalizeInviteCode(inviteCode),
    [inviteCode],
  );

  function handleGoToInvite() {
    if (!cleanedCode) {
      setStatusMessage("Enter an invite code first.");
      return;
    }

    router.push(Capacitor.isNativePlatform() ? `/invite/__native__?code=${encodeURIComponent(cleanedCode)}` : `/invite/${cleanedCode}`);
  }

  async function handleCreateInvite() {
    setCreating(true);
    setStatusMessage("");
    setCreatedLink("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage("Please sign in first.");
        return;
      }

      const activeCrew = await getActiveCrew(user.id);

      if (!activeCrew) {
        setStatusMessage("Create a crew before generating an invite.");
        return;
      }

      const generatedCode = generateInviteCode("TC");
      const createdAt = new Date().toISOString();
      const authoritativeInviterName =
        activeCrew.ownerName || inviterName || "Crew Owner";

      const link = buildInviteLink(window.location.origin, generatedCode);

      const { error } = await supabase
        .from("crew_invites")
        .insert({
          user_id: user.id,
          crew_id: activeCrew.id,
          crew_owner_id: activeCrew.ownerId,
          code: generatedCode,
          inviter_name: authoritativeInviterName,
          inviter_avatar_url: inviterAvatarUrl || null,
          crew_name: activeCrew.name,
          status: "pending",
          created_at: createdAt,
        });

      if (error) {
        console.error("CREATE INVITE ERROR:", error);
        setStatusMessage(
          `Unable to create invite: ${
            error.message || "Unknown Supabase error"
          }`,
        );
        return;
      }

      setInviteCode(generatedCode);
      setCreatedLink(link);
      setStatusMessage("Invite created successfully.");
    } catch (error) {
      console.error("CREATE INVITE ERROR:", error);
      setStatusMessage("Invite creation failed. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!createdLink) return;

    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMessage("Unable to copy the invite link.");
    }
  }

  async function handleShare() {
    if (!createdLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my TwinCore Crew",
          text: `Join ${crewName} on TwinCore.`,
          url: createdLink,
        });
      } else {
        await navigator.clipboard.writeText(createdLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The user may cancel the native share sheet.
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05050b] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-fuchsia-600/15 blur-[110px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="twincore-join-content relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-7 flex items-center justify-between gap-4">
          <Link
            href="/crew"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Crew
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
            <Sparkles className="h-3.5 w-3.5" />
            TwinCore Invite
          </div>
        </header>

        <section className="mb-7 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,.22)]">
            <UserPlus className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
            Crew Invitation Center
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            Create a secure TwinCore invite for trusted people, or enter an
            existing code to join another crew.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,17,27,.96),rgba(8,8,15,.96))] p-5 shadow-[0_18px_55px_rgba(0,0,0,.42)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <Link2 className="h-5 w-5" />
              </span>

              <div>
                <h2 className="font-bold">Join an Existing Crew</h2>
                <p className="mt-1 text-xs text-white/45">
                  Enter the invite code sent by a trusted crew member.
                </p>
              </div>
            </div>

            <label
              htmlFor="inviteCode"
              className="mt-6 block text-xs font-bold uppercase tracking-[0.16em] text-white/50"
            >
              Invite code
            </label>

            <input
              id="inviteCode"
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              placeholder="TC-AB12CD34"
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold uppercase tracking-[0.08em] text-white outline-none placeholder:text-white/25 focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/10"
            />

            <button
              type="button"
              onClick={handleGoToInvite}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 active:scale-[0.98]"
            >
              Open Invite
              <ExternalLink className="h-4 w-4" />
            </button>
          </section>

          <section className="rounded-[1.75rem] border border-fuchsia-400/15 bg-[linear-gradient(180deg,rgba(25,12,34,.96),rgba(9,7,17,.96))] p-5 shadow-[0_18px_55px_rgba(0,0,0,.42)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-200">
                <Users className="h-5 w-5" />
              </span>

              <div>
                <h2 className="font-bold">Create a Crew Invite</h2>
                <p className="mt-1 text-xs text-white/45">
                  Generate a shareable link for your trusted crew.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="inviterName"
                  className="block text-xs font-bold uppercase tracking-[0.16em] text-white/50"
                >
                  Your name
                </label>

                <input
                  id="inviterName"
                  value={inviterName}
                  onChange={(event) => setInviterName(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-fuchsia-300/45 focus:ring-2 focus:ring-fuchsia-300/10"
                />
              </div>

              <div>
                <label
                  htmlFor="crewName"
                  className="block text-xs font-bold uppercase tracking-[0.16em] text-white/50"
                >
                  Crew name
                </label>

                <input
                  id="crewName"
                  value={crewName}
                  onChange={(event) => setCrewName(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-fuchsia-300/45 focus:ring-2 focus:ring-fuchsia-300/10"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateInvite}
              disabled={creating}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#d946ef,#8b5cf6,#22d3ee)] px-5 py-3 text-sm font-black text-white shadow-[0_0_28px_rgba(217,70,239,.25)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Invite
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Invite
                </>
              )}
            </button>
          </section>
        </div>

        {createdLink ? (
          <section className="mt-5 rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/[0.055] p-5 shadow-[0_0_38px_rgba(52,211,153,.08)] sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">
                <Check className="h-5 w-5" />
              </span>

              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                  Crew Invite Ready
                </div>
                <p className="mt-2 text-sm text-white/55">
                  Share this secure link with the person you want to add.
                </p>
              </div>
            </div>

            <div className="mt-4 break-all rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/85">
              {createdLink}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 py-2 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>

              <Link
                href={createdLink}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Open Invite
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}

        {statusMessage ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {statusMessage}
          </div>
        ) : null}
      </div>
    </main>
  );
}
