"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLocalInvite, normalizeInviteCode } from "@/lib/invite-system";
import { supabase } from "@/lib/supabase";

export default function JoinPage() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState("");
  const [inviterName, setInviterName] = useState("Neo");
  const [crewName, setCrewName] = useState("TwinCore Crew");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
          code: localInvite.code,
          inviter_name: localInvite.inviterName,
          crew_name: localInvite.crewName,
          status: localInvite.status,
          created_at: localInvite.createdAt,
        })
        .select();

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        setStatusMessage(`Supabase error: ${error.message}`);
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
    if (!createdLink) return;

    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
            Crew Access
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Join or create an invite
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
            Enter a code to join an existing TwinCore invite, or generate a fresh link for another user.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-6">
            <h2 className="text-lg font-semibold">Join with invite code</h2>
            <div className="mt-4 space-y-4">
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
            <h2 className="text-lg font-semibold">Create a fresh invite</h2>

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
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
                  Share this link
                </div>
                <div className="mt-2 break-all text-sm text-white/85">{createdLink}</div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>

                  <a
                    href={createdLink}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Open link
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