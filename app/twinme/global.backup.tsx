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
} from "lucide-react";
import { usePathname } from "next/navigation";

/* =========================
   TYPES
========================= */
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

/* =========================
   SIGNALS
========================= */
function readLocalSignals(): LocalSignals {
  if (typeof window === "undefined") {
    return {
      partyStatus: null,
      exitStatus: null,
      hasSharedLocation: false,
      hour: new Date().getHours(),
    };
  }

  return {
    partyStatus: localStorage.getItem("twincore_party_status"),
    exitStatus: localStorage.getItem("twincore_exit_crew_status"),
    hasSharedLocation: Boolean(
      localStorage.getItem("twincore_last_shared_location")
    ),
    hour: new Date().getHours(),
  };
}

/* =========================
   INTELLIGENCE ENGINE
========================= */
function getTwinMeSurface(
  pathname: string,
  signals: LocalSignals
): TwinMeSurface {
  const isLateNight = signals.hour >= 23 || signals.hour < 5;
  const isNeedHelp = signals.partyStatus === "need-help";
  const isImGood = signals.partyStatus === "im-good";
  const isHeadingHome = Boolean(signals.exitStatus);

  if (isNeedHelp) {
    return {
      tone: "red",
      label: "Priority Alert",
      insight:
        "A help signal is active. Reduce distractions and move to safety immediately.",
      chips: ["ALERT", "CREW ACTION"],
      primaryHref: "/crew",
      primaryLabel: "Open Crew",
    };
  }

  if (pathname.startsWith("/party")) {
    return {
      tone: isLateNight ? "orange" : "blue",
      label: "Party Insight",
      insight: isImGood
        ? "You’re steady. Stay aware and move intentionally."
        : "Stay ahead of drift. Keep your crew aware of your movement.",
      chips: [
        isLateNight ? "LATE NIGHT" : "ACTIVE",
        signals.hasSharedLocation ? "LOCATION ON" : "LOCATION OFF",
      ],
      primaryHref: "/party",
      primaryLabel: "Open Party",
    };
  }

  if (pathname.startsWith("/crew")) {
    return {
      tone: isHeadingHome ? "emerald" : "blue",
      label: "Crew Insight",
      insight: isHeadingHome
        ? "Heading home. Keep updates simple."
        : "Stay connected. Watch for changes.",
      chips: ["LIVE CREW"],
      primaryHref: "/crew",
      primaryLabel: "Open Crew",
    };
  }

  if (isLateNight) {
    return {
      tone: "orange",
      label: "Late Awareness",
      insight: "Stay intentional. This is where mistakes happen.",
      chips: ["LATE NIGHT"],
      primaryHref: "/twinme",
      primaryLabel: "Open TwinMe",
    };
  }

  return {
    tone: "blue",
    label: "System Ready",
    insight: "All systems active. Stay aware.",
    chips: ["READY"],
    primaryHref: "/twinme",
    primaryLabel: "Open TwinMe",
  };
}

/* =========================
   🔥 NEW: AMBIENT ENGINE
========================= */
function getAmbientStyle(tone: TwinMeSurface["tone"]) {
  if (tone === "red") {
    return "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.25),#020202)]";
  }
  if (tone === "orange") {
    return "bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.25),#020202)]";
  }
  if (tone === "emerald") {
    return "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.25),#020202)]";
  }
  return "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25),#020202)]";
}

/* =========================
   ICON
========================= */
function ToneIcon({ tone }: { tone: TwinMeSurface["tone"] }) {
  if (tone === "orange") return <MoonStar className="h-4 w-4 text-white" />;
  if (tone === "emerald") return <MapPin className="h-4 w-4 text-white" />;
  if (tone === "red") return <AlertTriangle className="h-4 w-4 text-white" />;
  return <Brain className="h-4 w-4 text-white" />;
}

/* =========================
   MAIN COMPONENT
========================= */
export default function TwinMeGlobal() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [signals, setSignals] = useState<LocalSignals>(() =>
    readLocalSignals()
  );

  useEffect(() => {
    const refresh = () => setSignals(readLocalSignals());
    refresh();

    const interval = setInterval(refresh, 30000);
    window.addEventListener("storage", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const surface = useMemo(
    () => getTwinMeSurface(pathname, signals),
    [pathname, signals]
  );

  return (
    <>
      {/* 🔥 GLOBAL AMBIENT BACKGROUND */}
      <div
        className={`fixed inset-0 -z-10 transition-all duration-[2000ms] ${getAmbientStyle(
          surface.tone
        )} animate-pulse`}
      />

      {/* 🔵 FLOATING TWINME */}
      <div className="fixed inset-x-0 bottom-4 z-50 px-4">
        <div className="mx-auto max-w-md">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 backdrop-blur-xl bg-white/5 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <ToneIcon tone={surface.tone} />
                  TwinMe • {surface.label}
                </div>
                <ChevronUp className="h-4 w-4 text-white/70" />
              </div>
            </button>
          ) : (
            <div className="rounded-3xl border border-white/10 p-4 backdrop-blur-xl bg-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-white font-semibold">
                  TwinMe • {surface.label}
                </span>
                <button onClick={() => setExpanded(false)}>close</button>
              </div>

              <p className="text-white/80 text-sm mb-3">
                {surface.insight}
              </p>

              <Link
                href={surface.primaryHref}
                className="text-white underline"
              >
                {surface.primaryLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}