"use client";

import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;

  badge?: ReactNode;

  children?: ReactNode;

  collapsed?: boolean;
};

export function TwinIdentity({
  eyebrow = "Identity",
  title,
  subtitle,
  badge,
  children,
}: Props) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.24em] text-white/35 font-black">
              {eyebrow}
            </div>

            <h3 className="mt-2 text-xl font-black text-white">
              {title}
            </h3>

            {subtitle && (
              <p className="mt-1 text-sm text-white/45">
                {subtitle}
              </p>
            )}
          </div>

          {badge && (
            <div>
              {badge}
            </div>
          )}
        </div>

        {children && (
          <div className="mt-5 border-t border-white/5 pt-5">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
