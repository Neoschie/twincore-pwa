"use client";

import { startSubscriptionPurchase } from "@/lib/subscription/purchase";

type UpgradePromptProps = {
  title?: string;
  description?: string;
};

export default function UpgradePrompt({
  title = "Unlock Full TwinCore Access",
  description = "Premium and Party Pass unlock advanced TwinMe intelligence, predictive awareness, voice support, and ecosystem syncing.",
}: UpgradePromptProps) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-3xl p-5 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
      <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
        Upgrade Required
      </div>

      <h2 className="text-xl font-semibold text-white">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-white/60">
        {description}
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={async () => {
            const result =
              await startSubscriptionPurchase("premium");

            if (result.success && result.redirectTo) {
              window.location.href = result.redirectTo;
            }
          }}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black"
        >
          Start Premium • $24.99/mo
        </button>

        <button
          type="button"
          onClick={async () => {
            const result =
              await startSubscriptionPurchase("party_pass");

            if (result.success && result.redirectTo) {
              window.location.href = result.redirectTo;
            }
          }}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/85"
        >
          Try Party Pass • $5.99
        </button>
      </div>
    </div>
  );
}