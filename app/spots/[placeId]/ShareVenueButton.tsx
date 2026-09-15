"use client";

type ShareVenueButtonProps = {
  venueName: string;
  venueUrl: string;
};

export default function ShareVenueButton({
  venueName,
  venueUrl,
}: ShareVenueButtonProps) {
  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: venueName,
          text: `Check out ${venueName} on TwinCore.`,
          url: venueUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(venueUrl);
      alert("Venue link copied!");
    } catch (error) {
      console.error("Unable to share venue:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/[0.05]"
    >
      <div className="text-xl">↗️</div>
      <div className="mt-3 text-sm font-black text-white">Share</div>
      <div className="mt-1 text-xs text-white/45">Share venue</div>
    </button>
  );
}