"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Brain, ChevronUp, Sparkles, AlertTriangle, MoonStar, MapPin, Users } from "lucide-react";
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
      hour: new Date().getHours(),
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
  if (tone === "orange") return "shadow-[0_0_30px_rgba(249,115,22,0.25)]";
  if (tone === "emerald") return "shadow-[0_0_30px_rgba(16,185,129,0.25)]";
  if (tone === "red") return "shadow-[0_0_30px_rgba(239,68,68,0.30)]";
  return "shadow-[0_0_30px_rgba(59,130,246,0.25)]";
}

function toneBg(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") {
    return "bg-[linear-gradient(180deg,rgba(249,115,22,0.18),rgba(20,12,8,0.96))]";
  }
  if (tone === "emerald") {
    return "bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(8,18,14,0.96))]";
  }
  if (tone === "red") {
    return "bg-[linear-gradient(180deg,rgba(239,68,68,0.20),rgba(22,8,10,0.96))]";
  }
  return "bg-[linear-gradient(180deg,rgba(59,130,246,0.18),rgba(10,14,26,0.96))]";
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

export default function TwinMeGlobal() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [signals, setSignals] = useState<LocalSignals>(() => readLocalSignals());

  useEffect(() => {
    const refreshSignals = () => setSignals(readLocalSignals());

    refreshSignals();

    const interval = window.setInterval(refreshSignals, 30000);
    window.addEventListener("storage", refreshSignals);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refreshSignals);
    };
  }, []);

  const surface = useMemo(() => getTwinMeSurface(pathname, signals), [pathname, signals]);

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto max-w-md">
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className={`w-full rounded-2xl border border-white/10 px-4 py-3 backdrop-blur-xl transition-all duration-300 ${toneBg(
              surface.tone
            )} ${toneGlow(surface.tone)} animate-pulse`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <ToneIcon tone={surface.tone} />
                  <span className="truncate text-sm font-medium text-white">
                    TwinMe • {surface.label}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/85">
                    LIVE
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-1.5">
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

              <ChevronUp className="h-4 w-4 shrink-0 text-white/70" />
            </div>
          </button>
        )}

        {expanded && (
          <div
            className={`rounded-3xl border border-white/10 p-4 backdrop-blur-xl transition-all duration-300 ${toneBg(
              surface.tone
            )} ${toneGlow(surface.tone)}`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <ToneIcon tone={surface.tone} />
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
        )}
      </div>
    </div>
  );
}
