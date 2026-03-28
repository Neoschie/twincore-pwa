"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  MoonStar,
  MapPin,
  Users,
  Activity,
} from "lucide-react";
import { usePathname } from "next/navigation";

type TwinMeSurface = {
  tone: "blue" | "orange" | "emerald" | "red";
  label: string;
  insight: string;
  chips: string[];
  primaryHref: string;
  primaryLabel: string;
};

type LocalSignals = {
  partyStatus: string | null;
  exitStatus: string | null;
  hasSharedLocation: boolean;
  hour: number;
};

function readLocalSignals(): LocalSignals {
  if (typeof window === "undefined") {
    return {
      partyStatus: null,
      exitStatus: null,
      hasSharedLocation: false,
      hour: 12,
    };
  }

  const partyStatus = window.localStorage.getItem("twincore_party_status");
  const exitStatus = window.localStorage.getItem("twincore_exit_crew_status");
  const sharedLocation = window.localStorage.getItem("twincore_last_shared_location");

  return {
    partyStatus,
    exitStatus,
    hasSharedLocation: Boolean(sharedLocation),
    hour: new Date().getHours(),
  };
}

function getTwinMeSurface(pathname: string, signals: LocalSignals): TwinMeSurface {
  const isLateNight = signals.hour >= 23 || signals.hour < 5;
  const isNeedHelp = signals.partyStatus === "need-help";
  const isImGood = signals.partyStatus === "im-good";
  const isHeadingHome = Boolean(signals.exitStatus);

  if (isNeedHelp) {
    return {
      tone: "red",
      label: "Priority Alert",
      insight:
        "A help signal is active. Reduce distractions, get to your safest next step, and contact your crew now.",
      chips: ["ALERT", "CREW ACTION"],
      primaryHref: "/crew",
      primaryLabel: "Open Crew",
    };
  }

  if (pathname.startsWith("/crew")) {
    if (isHeadingHome) {
      return {
        tone: "emerald",
        label: "Crew Insight",
        insight:
          "Your flow has shifted into heading-home mode. Keep updates simple and make sure your crew can follow your status.",
        chips: ["HEADING HOME", "CONNECTED"],
        primaryHref: "/after",
        primaryLabel: "Open After",
      };
    }

    return {
      tone: "blue",
      label: "Crew Insight",
      insight:
        "Stay connected and notice changes early. TwinMe works best when your status, location, and crew signals stay current.",
      chips: [
        signals.hasSharedLocation ? "LOCATION ON" : "LOCATION OFF",
        "LIVE CREW",
      ],
      primaryHref: "/crew",
      primaryLabel: "Open Crew",
    };
  }

  if (pathname.startsWith("/party")) {
    if (isLateNight && !signals.hasSharedLocation) {
      return {
        tone: "orange",
        label: "Party Insight",
        insight:
          "It’s late and your location is not shared. Keep your movement predictable and avoid drifting off alone.",
        chips: ["LATE NIGHT", "LOCATION OFF"],
        primaryHref: "/crew",
        primaryLabel: "Open Crew",
      };
    }

    if (isImGood) {
      return {
        tone: "emerald",
        label: "Party Insight",
        insight:
          "You marked yourself good. Stay aware, keep your decisions slower than the room, and update your status if things change.",
        chips: ["I'M GOOD", "STEADY"],
        primaryHref: "/party",
        primaryLabel: "Open Party",
      };
    }

    return {
      tone: "orange",
      label: "Party Insight",
      insight:
        "Move with the energy, but stay ahead of drift. TwinMe is strongest when your crew can see your live state.",
      chips: [
        isLateNight ? "LATE NIGHT" : "ACTIVE",
        signals.hasSharedLocation ? "LOCATION ON" : "LOCATION OFF",
      ],
      primaryHref: "/party",
      primaryLabel: "Open Party",
    };
  }

  if (pathname.startsWith("/contact-card")) {
    return {
      tone: "emerald",
      label: "Identity Insight",
      insight:
        "Share only what helps you stay reachable, safe, and in control. Clear identity beats oversharing every time.",
      chips: ["IDENTITY", "CONTROL"],
      primaryHref: "/contact-card",
      primaryLabel: "Open Card",
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      tone: "emerald",
      label: "Profile Insight",
      insight:
        "Your profile powers TwinMe context. Keep it accurate so your guidance feels personal and useful in live moments.",
      chips: ["PROFILE", "READY"],
      primaryHref: "/profile",
      primaryLabel: "Open Profile",
    };
  }

  if (pathname.startsWith("/join")) {
    return {
      tone: "blue",
      label: "Join Insight",
      insight:
        "Keep entry friction low. The easier people join, the stronger your real-time crew layer becomes.",
      chips: ["ONBOARDING", "NETWORK"],
      primaryHref: "/join",
      primaryLabel: "Open Join",
    };
  }

  if (pathname.startsWith("/twinme")) {
    return {
      tone: "blue",
      label: "TwinMe Live",
      insight:
        "This is your awareness layer. Use it to stay steady, not to overthink the moment.",
      chips: ["LIVE", "GUIDANCE"],
      primaryHref: "/twinme",
      primaryLabel: "Open TwinMe",
    };
  }

  if (isHeadingHome) {
    return {
      tone: "emerald",
      label: "Dashboard Insight",
      insight:
        "You’re in a heading-home flow. Keep your route simple, your signals current, and your final status easy to confirm.",
      chips: ["HEADING HOME", "SAFE EXIT"],
      primaryHref: "/after",
      primaryLabel: "Open After",
    };
  }

  if (isLateNight) {
    return {
      tone: "orange",
      label: "Dashboard Insight",
      insight:
        "It’s getting late. This is the best moment to stay intentional with movement, updates, and exits.",
      chips: ["LATE NIGHT", signals.hasSharedLocation ? "LOCATION ON" : "LOCATION OFF"],
      primaryHref: "/twinme",
      primaryLabel: "Open TwinMe",
    };
  }

  return {
    tone: "blue",
    label: "Dashboard Insight",
    insight:
      "Your system is strongest when Crew, Party Mode, and TwinMe all stay active together in real time.",
    chips: [
      signals.hasSharedLocation ? "LOCATION ON" : "LOCATION OFF",
      "SYSTEM READY",
    ],
    primaryHref: "/twinme",
    primaryLabel: "Open TwinMe",
  };
}

function toneGlow(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") return "shadow-[0_0_40px_rgba(249,115,22,0.24)]";
  if (tone === "emerald") return "shadow-[0_0_40px_rgba(16,185,129,0.24)]";
  if (tone === "red") return "shadow-[0_0_40px_rgba(239,68,68,0.30)]";
  return "shadow-[0_0_40px_rgba(59,130,246,0.24)]";
}

function toneCardBg(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") {
    return "bg-[linear-gradient(180deg,rgba(249,115,22,0.17),rgba(16,10,8,0.94))]";
  }
  if (tone === "emerald") {
    return "bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(8,16,14,0.94))]";
  }
  if (tone === "red") {
    return "bg-[linear-gradient(180deg,rgba(239,68,68,0.18),rgba(18,8,10,0.95))]";
  }
  return "bg-[linear-gradient(180deg,rgba(59,130,246,0.16),rgba(10,14,24,0.94))]";
}

function toneOrb(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") return "bg-orange-400/25";
  if (tone === "emerald") return "bg-emerald-400/25";
  if (tone === "red") return "bg-red-400/25";
  return "bg-blue-400/25";
}

function toneRing(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") return "border-orange-300/20";
  if (tone === "emerald") return "border-emerald-300/20";
  if (tone === "red") return "border-red-300/20";
  return "border-blue-300/20";
}

function ToneIcon({ tone }: { tone: TwinMeSurface["tone"] }) {
  if (tone === "orange") {
    return <MoonStar className="h-4 w-4 text-white" />;
  }
  if (tone === "emerald") {
    return <MapPin className="h-4 w-4 text-white" />;
  }
  if (tone === "red") {
    return <AlertTriangle className="h-4 w-4 text-white" />;
  }
  return <Brain className="h-4 w-4 text-white" />;
}

function AmbientLayer({ tone }: { tone: TwinMeSurface["tone"] }) {
  const base =
    tone === "orange"
      ? "from-orange-500/16 via-orange-300/8 to-transparent"
      : tone === "emerald"
      ? "from-emerald-500/16 via-emerald-300/8 to-transparent"
      : tone === "red"
      ? "from-red-500/18 via-red-300/8 to-transparent"
      : "from-blue-500/16 via-cyan-300/8 to-transparent";

  const glow =
    tone === "orange"
      ? "bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.16),transparent_55%)]"
      : tone === "emerald"
      ? "bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.16),transparent_55%)]"
      : tone === "red"
      ? "bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.18),transparent_55%)]"
      : "bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.16),transparent_55%)]";

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${base} transition-all duration-1000`} />
      <div className={`absolute inset-0 ${glow} transition-all duration-1000`} />

      <div
        className={`absolute left-[-8rem] top-[12%] h-56 w-56 rounded-full blur-3xl ${toneOrb(
          tone
        )} animate-[pulse_7s_ease-in-out_infinite]`}
      />
      <div
        className={`absolute right-[-7rem] top-[32%] h-72 w-72 rounded-full blur-3xl ${toneOrb(
          tone
        )} animate-[pulse_9s_ease-in-out_infinite]`}
      />
      <div
        className={`absolute bottom-[-9rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl ${toneOrb(
          tone
        )} animate-[pulse_11s_ease-in-out_infinite]`}
      />

      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:28px_28px]" />
    </div>
  );
}

export default function TwinMeGlobal() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<LocalSignals>({
    partyStatus: null,
    exitStatus: null,
    hasSharedLocation: false,
    hour: 12,
  });

  useEffect(() => {
    setMounted(true);

    const refreshSignals = () => {
      setSignals(readLocalSignals());
    };

    refreshSignals();

    const interval = window.setInterval(refreshSignals, 30000);
    window.addEventListener("storage", refreshSignals);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refreshSignals);
    };
  }, []);

  const surface = useMemo(() => getTwinMeSurface(pathname, signals), [pathname, signals]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <AmbientLayer tone={surface.tone} />

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
        <div className="pointer-events-auto mx-auto max-w-md">
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className={`relative w-full overflow-hidden rounded-2xl border ${toneRing(
                surface.tone
              )} px-4 py-3 backdrop-blur-xl transition-all duration-300 ${toneCardBg(
                surface.tone
              )} ${toneGlow(surface.tone)}`}
            >
              <div className="absolute inset-0 opacity-60">
                <div className="absolute -left-8 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-white/8 blur-2xl" />
              </div>

              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute inset-0 rounded-full bg-white/15 blur-md" />
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10">
                        <ToneIcon tone={surface.tone} />
                      </span>
                    </div>

                    <span className="truncate text-sm font-medium text-white">
                      TwinMe • {surface.label}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/85">
                      <Activity className="h-3 w-3" />
                      LIVE
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {surface.chips.slice(0, 2).map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/70"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <ChevronUp className="h-4 w-4 shrink-0 text-white/70" />
                </div>
              </div>
            </button>
          )}

          {expanded && (
            <div
              className={`relative overflow-hidden rounded-3xl border ${toneRing(
                surface.tone
              )} p-4 backdrop-blur-xl transition-all duration-300 ${toneCardBg(
                surface.tone
              )} ${toneGlow(surface.tone)}`}
            >
              <div className="absolute inset-0 opacity-60">
                <div className="absolute -left-12 top-8 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/8 blur-2xl" />
                <div className="absolute bottom-0 right-10 h-24 w-24 rounded-full bg-white/8 blur-3xl" />
              </div>

              <div className="relative">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative">
                      <span className="absolute inset-0 rounded-full bg-white/15 blur-md" />
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10">
                        <ToneIcon tone={surface.tone} />
                      </span>
                    </div>

                    <span className="truncate text-sm font-semibold text-white">
                      TwinMe • {surface.label}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/85">
                      <Sparkles className="h-3 w-3" />
                      LIVE
                    </span>
                  </div>

                  <button
                    onClick={() => setExpanded(false)}
                    className="text-xs text-white/60 transition hover:text-white"
                  >
                    close
                  </button>
                </div>

                <p className="mb-3 text-sm leading-6 text-white/80">{surface.insight}</p>

                <div className="mb-3 flex flex-wrap gap-2">
                  {surface.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={surface.primaryHref}
                    className="rounded-full bg-white/12 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/16"
                  >
                    {surface.primaryLabel}
                  </Link>

                  {pathname !== "/crew" ? (
                    <Link
                      href="/crew"
                      className="rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/14"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Crew
                      </span>
                    </Link>
                  ) : null}

                  {pathname !== "/party" ? (
                    <Link
                      href="/party"
                      className="rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/14"
                    >
                      Party
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}