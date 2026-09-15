"use client";

type InviteCrewButtonProps = {
  venueName: string;
  venueUrl: string;
};

export default function InviteCrewButton({
  venueName,
  venueUrl,
}: InviteCrewButtonProps) {
  async function handleInvite() {
    const inviteText = `Join me at ${venueName} on TwinCore: ${venueUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Meet me at ${venueName}`,
          text: inviteText,
          url: venueUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(inviteText);
      alert("Crew invite copied!");
    } catch (error) {
      console.error("Unable to invite crew:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/[0.05]"
    >
      <div className="text-xl">👥</div>
      <div className="mt-3 text-sm font-black text-white">
        Invite Crew
      </div>
      <div className="mt-1 text-xs text-white/45">
        Send this spot
      </div>
    </button>
  );
}