"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getSharedProfile } from "@/lib/shared-profile";
import { getActiveCrew } from "@/lib/crew-system";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  PageHeader,
  cardStyle,
  colors,
  gridFourStyle,
  navButtonStyle,
  secondaryButtonStyle,
  shellStyle,
  sectionHeadingStyle,
} from "@/components/twincore-ui";

const getProfileStorageKey = (userId: string) =>
  `twincore_profile_${userId}`;

type ProfileData = {
  displayName?: string;
  vibe?: string;
  city?: string;
  favoriteMusic?: string;
  emergencyName?: string;
  emergencyPhone?: string;
};

export default function ContactCardPage() {
  const [profile, setProfile] = useState<ProfileData>({});
  const [crewCode, setCrewCode] = useState("");
  const [shareUrl, setShareUrl] = useState("https://twincore.co/join");

useEffect(() => {
  async function loadContactCard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile({});
      setCrewCode("");
      return;
    }

    let localProfile: ProfileData = {};

    try {
      const rawProfile = localStorage.getItem(getProfileStorageKey(user.id));

      if (rawProfile) {
        localProfile = JSON.parse(rawProfile) as ProfileData;
      }
    } catch {
      localProfile = {};
    }

    let authoritativeDisplayName = "";

    try {
      const sharedProfile = await getSharedProfile(user.id);
      authoritativeDisplayName =
        sharedProfile?.display_name?.trim() || "";
    } catch (error) {
      console.error("CONTACT CARD SHARED PROFILE LOAD ERROR:", error);
    }

    setProfile({
      ...localProfile,
      displayName:
        authoritativeDisplayName ||
        localProfile.displayName?.trim() ||
        "",
    });

    try {
      const activeCrew = await getActiveCrew(user.id);
      setCrewCode(activeCrew?.inviteCode?.trim() || "");
    } catch (error) {
      console.error("CONTACT CARD CREW LOAD ERROR:", error);
      setCrewCode("");
    }
  }

  void loadContactCard();
}, []);

  useEffect(() => {
    const nextUrl = crewCode
      ? `https://twincore.co/join?code=${crewCode}`
      : `https://twincore.co/join`;

    setShareUrl(nextUrl);
  }, [crewCode]);

  const qrValue = useMemo(() => shareUrl, [shareUrl]);

  function shareCard() {
    alert("TwinCore Contact Card ready to share.");
  }

  function copyJoinLink() {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => alert("Join link copied."))
      .catch(() => alert("Could not copy join link."));
  }

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 8%, rgba(34,211,238,0.13), transparent 34%), radial-gradient(circle at 82% 26%, rgba(168,85,247,0.13), transparent 32%), radial-gradient(circle at 50% 100%, rgba(236,72,153,0.08), transparent 38%)",
        }}
      />

      <div className="twincore-contact-content relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              TwinCore • Contact
            </div>

            <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              This is me.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
              Your TwinCore identity, your crew connection, and one simple way
              to bring someone in.
            </p>
          </div>

          <Link
            href="/profile"
            className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.09]"
          >
            Edit Profile
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/15 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 12% 0%, rgba(34,211,238,0.12), transparent 32%), radial-gradient(circle at 92% 100%, rgba(168,85,247,0.10), transparent 34%)",
            }}
          />

          <div className="relative">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-xl font-black text-cyan-100">
                {(profile.displayName || "Y").trim().charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/55">
                  Your TwinCore identity
                </div>

                <h2 className="mt-1 truncate text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                  {profile.displayName || "Your Name"}
                </h2>

                <p className="mt-1 text-sm text-white/50">
                  {profile.vibe || "Your vibe"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">City</div>
                <div className="mt-1 font-semibold text-white/85">
                  {profile.city || "Not set"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Favorite Music</div>
                <div className="mt-1 font-semibold text-white/85">
                  {profile.favoriteMusic || "Not set"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Emergency Contact</div>
                <div className="mt-1 font-semibold text-white/85">
                  {profile.emergencyName || "Not set"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Emergency Phone</div>
                <div className="mt-1 font-semibold text-white/85">
                  {profile.emergencyPhone || "Not set"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="my-5 flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/30">
            This is my crew
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <section className="rounded-[30px] border border-fuchsia-300/15 bg-white/[0.04] p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/55">
                Crew invitation
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                Join me on TwinCore.
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
                Scan the code or copy the link to join my active Crew.
              </p>

              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Crew Code
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-white/85">
                  {crewCode || "Not available"}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Join Link
                </div>
                <div className="mt-2 break-all text-xs leading-5 text-white/55">
                  {shareUrl}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={shareCard}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.13]"
                >
                  Share Card
                </button>

                <button
                  onClick={copyJoinLink}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.09]"
                >
                  Copy Join Link
                </button>
              </div>
            </div>

            <div className="mx-auto lg:mx-0">
              <div className="rounded-[26px] border border-white/10 bg-white p-4 shadow-2xl shadow-fuchsia-950/20">
                <QRCodeCanvas value={qrValue} size={220} />
              </div>

              <div className="mt-3 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Scan to join
              </div>
            </div>
          </div>
        </section>

        <div className="my-5 flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/30">
            Join me
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <section className="rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link href="/" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-center text-sm font-semibold text-white/65 transition hover:bg-white/[0.06]">
              Home
            </Link>

            <Link href="/crew" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-center text-sm font-semibold text-white/65 transition hover:bg-white/[0.06]">
              Crew
            </Link>

            <Link href="/party" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-center text-sm font-semibold text-white/65 transition hover:bg-white/[0.06]">
              Party
            </Link>

            <Link href="/profile" className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-center text-sm font-semibold text-white/65 transition hover:bg-white/[0.06]">
              Profile
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
