import Link from "next/link";

const SECOND_LAYER = `You can stay with this moment a little longer.
There’s no rush.
Let your shoulders soften if they want to.
Notice one place in your body that feels steady or supported.
You don’t need to name anything.
You don’t need to understand anything.
Just notice what’s still here with you.`;

export default function SecondLayerPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-6">
        <pre className="whitespace-pre-wrap text-base leading-7 opacity-95">
          {SECOND_LAYER}
        </pre>

        <div className="flex items-center gap-3">
          <Link
            href="/after"
            className="rounded-2xl px-4 py-2 text-sm border border-white/15 hover:border-white/35 transition"
          >
            Return to silence
          </Link>
        </div>
      </div>
    </main>
  );
}
<a href="/" className="text-xs opacity-40 hover:opacity-70 transition">
  Home
</a>
