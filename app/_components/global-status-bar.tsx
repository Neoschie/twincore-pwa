"use client";

import StatusChip from "./status-chip";

export default function GlobalStatusBar() {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
      <StatusChip label="LIVE" tone="blue" />
      <StatusChip label="PROTECTED" tone="emerald" />
    </div>
  );
}