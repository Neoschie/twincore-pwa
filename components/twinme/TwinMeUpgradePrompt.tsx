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

<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-5 backdrop-blur-md">

<div className="w-full max-w-md">

<div className="rounded-3xl border border-white/10 bg-black/80 p-5 backdrop-blur-xl">

<div className="text-lg font-black text-white">

Upgrade Prompt

</div>

<p className="mt-3 text-sm text-white/70">

TwinMe premium experience placeholder.

</p>

<button
onClick={onClose}
className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-white/70"
>

Maybe Later

</button>

</div>

</div>

</div>

  );

}