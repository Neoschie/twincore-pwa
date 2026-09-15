"use client";

import { Users } from "lucide-react";

type CrewMember = {
  id: string;
  name: string;
};

type Props = {
  partyActive: boolean;
  crewCount: number;
  crewMembers: CrewMember[];
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function CrewStrip({
  partyActive,
  crewCount,
  crewMembers,
}: Props) {
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-fuchsia-300/15 bg-black/25 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full border ${
            partyActive
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/40"
          }`}
        >
          <Users className="h-4 w-4" />
        </span>

        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-white/80">
            Crew Online
          </div>
          <div className="mt-0.5 text-[10px] text-white/40">
            {crewCount} live signal{crewCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="flex items-center">
        {crewMembers.slice(0, 5).map((member, index) => (
          <div
            key={member.id}
            title={member.name}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-[#10111a] text-[10px] font-black text-white shadow-[0_0_18px_rgba(217,70,239,0.22)] ${
              index === 0 ? "" : "-ml-2"
            } ${
              index % 3 === 0
                ? "border-fuchsia-300/70"
                : index % 3 === 1
                  ? "border-cyan-300/70"
                  : "border-orange-300/70"
            }`}
          >
            {initials(member.name) || "TC"}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#10111a] bg-emerald-300" />
          </div>
        ))}

        {crewMembers.length > 5 ? (
          <div className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-300/50 bg-[#10111a] text-[10px] font-black text-orange-100">
            +{crewMembers.length - 5}
          </div>
        ) : null}

        {crewMembers.length === 0 ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-white/40">
            No crew online
          </div>
        ) : null}
      </div>
    </div>
  );
}
