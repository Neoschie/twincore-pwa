export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">TwinCore™</h1>
          <p className="text-sm opacity-70">v1 — Foundational Release</p>
        </div>

        <div className="space-y-3">
          <a
            href="/grounding?mode=baseline"
            className="block w-full rounded-2xl px-6 py-4 text-base font-medium border border-white/20 hover:border-white/40 transition"
          >
            Begin
          </a>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href="/grounding?mode=pre"
              className="block w-full rounded-2xl px-4 py-3 text-sm border border-white/15 hover:border-white/35 transition"
            >
              Before something
            </a>
            <a
              href="/grounding?mode=post"
              className="block w-full rounded-2xl px-4 py-3 text-sm border border-white/15 hover:border-white/35 transition"
            >
              After something
            </a>
          </div>
        </div>

        <p className="text-xs opacity-50">
          TwinCore™ offers grounding and presence. It is not a medical or therapeutic service.
        </p>
      </div>
    </main>
  );
}
