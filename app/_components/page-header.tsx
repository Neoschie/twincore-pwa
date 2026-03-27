"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  rightSlot,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
          TwinCore
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-lg text-white/75 sm:text-xl">
            {subtitle}
          </p>
        ) : null}
      </div>

      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
