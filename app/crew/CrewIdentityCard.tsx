"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Copy,
  Crown,
  Hash,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createCrew,
  deleteCrew,
  getActiveCrew,
  isCrewOwner,
  subscribeToCrew,
  type TwinCoreCrew,
} from "@/lib/crew-system";

type CrewIdentityCardProps = {
  userId: string | null;
  displayName: string;
};

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CrewIdentityCard({
  userId,
  displayName,
}: CrewIdentityCardProps) {
  const [crew, setCrew] = useState<TwinCoreCrew | null>(null);
  const [crewName, setCrewName] = useState(
    displayName.trim() ? `${displayName.trim()}'s Crew` : "My Crew",
  );
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) {
      setCrew(null);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const activeCrew = await getActiveCrew(userId);

        if (!cancelled) {
          setCrew(activeCrew);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your crew.",
          );
        }
      }
    };

    void refresh();
    const unsubscribe = subscribeToCrew(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  async function handleCreateCrew() {
    if (!userId) {
      setMessage("Please sign in before creating a crew.");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const created = await createCrew(
        userId,
        displayName.trim() || "Crew Member",
        crewName,
      );

      setCrew(created);
      setMessage("Crew created successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create crew.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleCopyInvite() {
    if (!crew) return;

    try {
      await navigator.clipboard.writeText(crew.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("Unable to copy the invite code.");
    }
  }

  async function handleDeleteCrew() {
    if (!userId || !crew) return;

    const confirmed = window.confirm(
      `Delete ${crew.name}? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteCrew(userId, crew.id);
      setCrew(null);
      setMessage("Crew deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete crew.",
      );
    }
  }

  if (!crew) {
    return (
      <section className="mb-6 rounded-[2rem] border border-fuchsia-400/20 bg-[linear-gradient(135deg,rgba(30,8,45,.96),rgba(8,14,27,.96))] p-5 shadow-[0_0_45px_rgba(217,70,239,.08)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100">
            <Users className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">
              Create Your Crew
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Build your trusted circle
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Create one crew identity that Party Mode, Spots, and TwinMe
              can recognize.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="crewName"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/45"
          >
            Crew name
          </label>

          <input
            id="crewName"
            value={crewName}
            onChange={(event) => setCrewName(event.target.value)}
            placeholder="Enter a crew name"
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-fuchsia-300/35"
          />
        </div>

        <button
          type="button"
          onClick={handleCreateCrew}
          disabled={creating || !crewName.trim()}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Create Crew
            </>
          )}
        </button>

        {message ? (
          <p className="mt-3 text-sm text-white/60">{message}</p>
        ) : null}
      </section>
    );
  }

  const owner = isCrewOwner(crew, userId);

  return (
    <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,22,35,.97),rgba(27,8,39,.96))] p-5 shadow-[0_0_45px_rgba(34,211,238,.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <ShieldCheck className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Active Crew
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              {crew.name}
            </h2>

            <p className="mt-1 text-sm text-white/50">
              TwinCore Crew Identity
            </p>
          </div>
        </div>

        {owner ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
            <Crown className="h-3.5 w-3.5" />
            Owner
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            <Hash className="h-3.5 w-3.5" />
            Crew ID
          </div>

          <p className="mt-2 break-all text-sm font-bold text-white">
            {crew.id}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            <Crown className="h-3.5 w-3.5" />
            Owner
          </div>

          <p className="mt-2 text-sm font-bold text-white">
            {crew.ownerName}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            <Users className="h-3.5 w-3.5" />
            Members
          </div>

          <p className="mt-2 text-sm font-bold text-white">
            {crew.memberCount}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            <CalendarDays className="h-3.5 w-3.5" />
            Created
          </div>

          <p className="mt-2 text-sm font-bold text-white">
            {formatCreatedAt(crew.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.055] p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
          Invite Code
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="break-all text-base font-black tracking-wider text-white">
            {crew.inviteCode}
          </p>

          <button
            type="button"
            onClick={handleCopyInvite}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/join"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Link>

        {owner ? (
          <button
            type="button"
            onClick={handleDeleteCrew}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-300/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-300/15"
          >
            <Trash2 className="h-4 w-4" />
            Delete Crew
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="mt-3 text-sm text-white/60">{message}</p>
      ) : null}
    </section>
  );
}
