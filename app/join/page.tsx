"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLocalInvite, normalizeInviteCode } from "@/lib/invite-system";
import { supabase } from "@/lib/supabase/client";

type StoredProfile = {
  displayName?: string;
  photoUrl?: string;
};

const getProfileStorageKey = (userId: string) =>
  `twincore_profile_${userId}`;

export default function JoinPage() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState("");
  const [inviterName, setInviterName] = useState("Neo");
  const [inviterAvatarUrl, setInviterAvatarUrl] = useState("");
  const [crewName, setCrewName] = useState("TwinCore Crew");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
  async function loadInviterProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const raw = localStorage.getItem(getProfileStorageKey(user.id));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredProfile;

      if (parsed.displayName?.trim()) {
        setInviterName(parsed.displayName.trim());
      }

      if (parsed.photoUrl?.trim()) {
        setInviterAvatarUrl(parsed.photoUrl.trim());
      }
    } catch {}
  }

  loadInviterProfile();
}, []);

  const cleanedCode = useMemo(() => normalizeInviteCode(inviteCode), [inviteCode]);

  async function handleGoToInvite() {
    if (!cleanedCode) {
      setStatusMessage("Enter an invite code first.");
      return;
    }

    router.push(`/invite/${cleanedCode}`);
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

const localInvite = createLocalInvite(inviterName, crewName);
const link = `${window.location.origin}/invite/${localInvite.code}`;

if (!supabase) {
        setCreatedLink(link);
        setInviteCode(localInvite.code);
        setStatusMessage("Supabase is not connected in this build.");
        return;
      }

      const { data, error } = await supabase
        .from("crew_invites")
        .insert({
  user_id: user.id,
  code: localInvite.code,
  inviter_name: localInvite.inviterName,
  inviter_avatar_url: inviterAvatarUrl || null,
  crew_name: localInvite.crewName,
  status: localInvite.status,
  created_at: localInvite.createdAt,
})
        .select();

      if (error) {
  console.error("SUPABASE INSERT ERROR MESSAGE:", error.message);
  console.error("SUPABASE INSERT ERROR DETAILS:", error.details);
  console.error("SUPABASE INSERT ERROR HINT:", error.hint);
  console.error("SUPABASE INSERT ERROR CODE:", error.code);

  setStatusMessage(
    `Supabase error: ${error.message || error.details || error.code || "Unknown error"}`
  );

  return;
}

      console.log("INSERT SUCCESS:", data);
      setCreatedLink(link);
      setInviteCode(localInvite.code);
      setStatusMessage("Invite created successfully.");
    } catch (error) {
      console.error("CREATE INVITE ERROR:", error);
      setStatusMessage("Invite creation failed. Check the browser console for details.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {

    async function handleShare() {
  if (!createdLink) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Join my TwinCore Crew",
        text: "Join my trusted TwinCore crew.",
        url: createdLink,
      });
    } else {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  } catch {}
}
    if (!createdLink) return;

    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
  if (!createdLink) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Join my TwinCore Crew",
        text: "Join my trusted TwinCore crew.",
        url: createdLink,
      });
    } else {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  } catch {}
}

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
       <div className="mb-6">
  <div className="inline-flex items-center rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
    Crew Invitations
  </div>

  <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
    Crew Invitation Center
  </h1>

  <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
    Create a crew invite, share it with trusted people, or enter a code to join someone else&apos;s TwinCore crew.
  </p>
</div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
<h2 className="text-lg font-semibold">Join an Existing Crew</h2>            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="inviteCode" className="mb-2 block text-sm text-white/70">
                  Invite code
                </label>
                <input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="TC-AB12CD34"
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGoToInvite}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
                >
                  Open invite
                </button>

                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Back home
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
            <h2 className="text-lg font-semibold">Create a Crew Invite</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inviterName" className="mb-2 block text-sm text-white/70">
                  Inviter name
                </label>
                <input
                  id="inviterName"
                  value={inviterName}
                  onChange={(event) => setInviterName(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-cyan-400/40"
                />
              </div>

              <div>
                <label htmlFor="crewName" className="mb-2 block text-sm text-white/70">
                  Crew name
                </label>
                <input
                  id="crewName"
                  value={crewName}
                  onChange={(event) => setCrewName(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-cyan-400/40"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreateInvite}
                disabled={creating}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-fuchsia-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create invite"}
              </button>
            </div>

            {createdLink ? (
  <div className="mt-5 rounded-3xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">

    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
      Crew Invite Ready 🎉
    </div>

    <p className="mt-2 text-sm text-white/70">
      Share this invite with trusted people to connect Party Mode,
      Crew, Spots and TwinMe.
    </p>

    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="break-all text-sm text-white/90">
        {createdLink}
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-3">

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-600"
      >
        {copied ? "Copied ✓" : "Copy Link"}
      </button>

      <a
        href={createdLink}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >

<button
  type="button"
  onClick={handleShare}
  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
>
  Share
</button>

<button
  type="button"
  onClick={handleShare}
  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
>
  Share
</button>

        Open Invite
      </a>

    </div>

  </div>
) : null}

            {statusMessage ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                {statusMessage}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}