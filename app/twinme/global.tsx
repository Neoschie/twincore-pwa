"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Brain, ChevronUp, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

type TwinMeSurface = {
  tone: "blue" | "orange" | "emerald";
  label: string;
  insight: string;
};

function getTwinMeSurface(pathname: string): TwinMeSurface {
  if (pathname.startsWith("/crew")) {
    return {
      tone: "blue",
      label: "Crew Insight",
      insight:
        "Stay connected and notice shifts early. Don’t drift from your people.",
    };
  }

  if (pathname.startsWith("/party")) {
    return {
      tone: "orange",
      label: "Party Insight",
      insight:
        "Move with the energy, but keep your decisions slower than the room.",
    };
  }

  if (pathname.startsWith("/contact-card")) {
    return {
      tone: "emerald",
      label: "Identity Insight",
      insight:
        "Share only what keeps you safe, reachable, and in control.",
    };
  }

  return {
    tone: "blue",
    label: "Dashboard Insight",
    insight:
      "Your system is strongest when Crew, Party Mode, and TwinMe work together.",
  };
}

function toneStyles(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") {
    return "border-orange-500/20 bg-[linear-gradient(180deg,rgba(249,115,22,0.18),rgba(20,12,8,0.96))]";
  }
  if (tone === "emerald") {
    return "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(8,18,14,0.96))]";
  }
  return "border-blue-500/20 bg-[linear-gradient(180deg,rgba(59,130,246,0.18),rgba(10,14,26,0.96))]";
}

export default function TwinMeGlobal() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const surface = useMemo(() => getTwinMeSurface(pathname), [pathname]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="mx-auto max-w-md">

        {/* COLLAPSED STATE */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className={`w-full rounded-2xl border px-4 py-3 flex items-center justify-between text-left backdrop-blur-xl shadow-lg ${toneStyles(surface.tone)}`}
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">
                TwinMe • {surface.label}
              </span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-white/10">
                LIVE
              </span>
            </div>

            <ChevronUp className="h-4 w-4 text-white/70" />
          </button>
        )}

        {/* EXPANDED */}
        {expanded && (
          <div
            className={`rounded-3xl border p-4 backdrop-blur-xl shadow-xl transition-all ${toneStyles(surface.tone)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  TwinMe • {surface.label}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  LIVE
                </span>
              </div>

              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-white/60 hover:text-white"
              >
                close
              </button>
            </div>

            <p className="text-sm text-white/80 leading-6 mb-3">
              {surface.insight}
            </p>

            <div className="flex gap-2 flex-wrap">
              <Link
                href="/twinme"
                className="px-3 py-2 rounded-full bg-white/10 text-sm"
              >
                Open TwinMe
              </Link>

              <Link
                href="/crew"
                className="px-3 py-2 rounded-full bg-white/10 text-sm"
              >
                Crew
              </Link>

              <Link
                href="/party"
                className="px-3 py-2 rounded-full bg-white/10 text-sm"
              >
                Party
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
