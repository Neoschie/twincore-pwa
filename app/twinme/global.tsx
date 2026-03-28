"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Brain, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

type TwinMeSurface = {
  tone: "blue" | "orange" | "emerald" | "neutral";
  label: string;
  insight: string;
};

function getTwinMeSurface(pathname: string): TwinMeSurface {
  if (pathname.startsWith("/crew")) {
    return {
      tone: "blue",
      label: "TwinMe • Crew Insight",
      insight:
        "Stay connected, notice shifts early, and avoid getting isolated from your people.",
    };
  }

  if (pathname.startsWith("/party")) {
    return {
      tone: "orange",
      label: "TwinMe • Party Insight",
      insight:
        "Move with the energy, but keep your decisions slower than the room around you.",
    };
  }

  if (pathname.startsWith("/contact-card")) {
    return {
      tone: "emerald",
      label: "TwinMe • Identity Insight",
      insight:
        "Share only what helps you stay safe, reachable, and in control of your presence.",
    };
  }

  if (pathname.startsWith("/profile")) {
    return {
      tone: "emerald",
      label: "TwinMe • Profile Insight",
      insight:
        "The more accurate your profile is, the more useful TwinMe becomes in live moments.",
    };
  }

  if (pathname.startsWith("/join")) {
    return {
      tone: "blue",
      label: "TwinMe • Join Insight",
      insight:
        "Keep joining simple. The less friction people feel, the stronger your crew network gets.",
    };
  }

  if (pathname.startsWith("/twinme")) {
    return {
      tone: "blue",
      label: "TwinMe • Live",
      insight:
        "This is your awareness layer. Use it to stay steady, not to overthink the moment.",
    };
  }

  return {
    tone: "blue",
    label: "TwinMe • Dashboard Insight",
    insight:
      "Your system is strongest when Crew, Party Mode, and TwinMe work together in real time.",
  };
}

function toneClasses(tone: TwinMeSurface["tone"]) {
  if (tone === "orange") {
    return {
      shell:
        "border-orange-500/20 bg-[linear-gradient(180deg,rgba(249,115,22,0.18),rgba(20,12,8,0.96))] shadow-[0_16px_40px_rgba(249,115,22,0.18)]",
      chip: "bg-orange-500/15 text-orange-100",
      button: "bg-orange-500/15 text-orange-100 hover:bg-orange-500/20",
    };
  }

  if (tone === "emerald") {
    return {
      shell:
        "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(8,18,14,0.96))] shadow-[0_16px_40px_rgba(16,185,129,0.16)]",
      chip: "bg-emerald-500/15 text-emerald-100",
      button: "bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20",
    };
  }

  if (tone === "neutral") {
    return {
      shell:
        "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,10,12,0.96))] shadow-[0_16px_40px_rgba(0,0,0,0.30)]",
      chip: "bg-white/10 text-white/80",
      button: "bg-white/10 text-white/85 hover:bg-white/15",
    };
  }

  return {
    shell:
      "border-blue-500/20 bg-[linear-gradient(180deg,rgba(59,130,246,0.18),rgba(10,14,26,0.96))] shadow-[0_16px_40px_rgba(59,130,246,0.18)]",
    chip: "bg-blue-500/15 text-blue-100",
    button: "bg-blue-500/15 text-blue-100 hover:bg-blue-500/20",
  };
}

export default function TwinMeGlobal() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  const surface = useMemo(() => getTwinMeSurface(pathname), [pathname]);
  const tones = useMemo(() => toneClasses(surface.tone), [surface.tone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="mx-auto w-full max-w-md">
        <div
          className={`pointer-events-auto overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-300 ${tones.shell}`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {surface.label}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tones.chip}`}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      LIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/12"
              aria-label={expanded ? "Collapse TwinMe" : "Expand TwinMe"}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          <div
            className={`grid transition-all duration-300 ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-4 pb-4">
                <p className="text-sm leading-6 text-white/80">
                  {surface.insight}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/twinme"
                    className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition ${tones.button}`}
                  >
                    Open TwinMe
                  </Link>

                  {pathname !== "/crew" ? (
                    <Link
                      href="/crew"
                      className="inline-flex items-center rounded-full bg-white/8 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/12"
                    >
                      Open Crew
                    </Link>
                  ) : null}

                  {pathname !== "/party" ? (
                    <Link
                      href="/party"
                      className="inline-flex items-center rounded-full bg-white/8 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/12"
                    >
                      Open Party
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
