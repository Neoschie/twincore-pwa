"use client";

import UpgradePrompt from "@/components/subscription/UpgradePrompt";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function TwinMeUpgradePrompt({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade TwinMe"
    >
      <div className="w-full max-w-md">
        <UpgradePrompt
          title="Unlock TwinMe Premium"
          description="Unlock advanced TwinMe intelligence, predictive awareness, hands-free voice, passive awareness, and ecosystem syncing."
        />

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/70 py-3 text-sm text-white/70 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
