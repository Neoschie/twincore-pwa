import { missions, phaseOrder } from "./missions";

// TWINCORE_MISSION_CONTROL_TRUTH_R16_7
//
// The original 98-mission catalog remains historical product-build
// progress. The active R-phase program is tracked separately so that
// completion of the legacy catalog cannot falsely imply TwinCore's
// current development program is complete.

const activeProgram = {
  phase: "R16",
  phaseName: "Product Intelligence Integration",
  currentMission: "R16.7 — Mission Control Truth",
  status: "IN PROGRESS",
  nextMission: "R16.8 — Product Integration Debt",
  completedMissions: [
    "R16.1",
    "R16.2",
    "R16.3",
    "R16.4",
    "R16.5",
    "R16.6",
  ],
  closedPhases: ["R14", "R15"],
} as const;

export default function DeveloperDashboard() {
  const completed = missions.filter(
    (mission) => mission.status === "complete",
  ).length;

  const total = missions.length;

  const historicalProgress =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  const phaseProgress = phaseOrder.map((phase) => {
    const phaseMissions = missions.filter(
      (mission) => mission.phase === phase,
    );

    const completedInPhase = phaseMissions.filter(
      (mission) => mission.status === "complete",
    ).length;

    const percentage =
      phaseMissions.length === 0
        ? 0
        : Math.round(
            (completedInPhase / phaseMissions.length) * 100,
          );

    return {
      phase,
      percentage,
    };
  });

  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-lg">
      <h2 className="mb-4 text-xl font-bold">
        🚀 TwinCore Mission Control
      </h2>

      <div className="mb-6 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/70">
          Active Development Program
        </div>

        <div className="text-base font-bold">
          {activeProgram.phase} — {activeProgram.phaseName}
        </div>

        <div className="mt-3 space-y-2 text-xs text-zinc-300">
          <div>
            <span className="font-semibold text-white">
              Current Mission:
            </span>{" "}
            {activeProgram.currentMission}
          </div>

          <div>
            <span className="font-semibold text-white">
              Status:
            </span>{" "}
            {activeProgram.status}
          </div>

          <div>
            <span className="font-semibold text-white">
              Next Mission:
            </span>{" "}
            {activeProgram.nextMission}
          </div>

          <div>
            <span className="font-semibold text-white">
              R16 Locked:
            </span>{" "}
            {activeProgram.completedMissions.length} missions
          </div>

          <div>
            <span className="font-semibold text-white">
              Closed Phases:
            </span>{" "}
            {activeProgram.closedPhases.join(", ")}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-sm">
          <span>Historical Build Catalog</span>
          <span>{historicalProgress}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-zinc-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${historicalProgress}%` }}
          />
        </div>

        <div className="mt-2 text-xs text-zinc-400">
          {completed} / {total} legacy missions complete
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">
          Historical Phase Progress
        </h3>

        <div className="space-y-3">
          {phaseProgress.map(({ phase, percentage }) => (
            <div key={phase}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{phase}</span>
                <span>{percentage}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
