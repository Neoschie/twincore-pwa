import Link from "next/link";

const featureCards = [
  {
    eyebrow: "Social Layer",
    title: "Crew Radar",
    description: "Invite crew, join with code, and view live crew activity.",
    href: "/crew",
    tone: "default",
  },
  {
    eyebrow: "Activity Layer",
    title: "Party Mode",
    description: "Broadcast statuses like Outside, At club, Safe, or Heading home.",
    href: "/party",
    tone: "warm",
  },
  {
    eyebrow: "Guidance Layer",
    title: "TwinMe",
    description: "Live insight, grounding cues, and smarter next-step decisions.",
    href: "/twinme",
    tone: "blue",
  },
  {
    eyebrow: "Sharing Layer",
    title: "Contact Card",
    description: "Share your identity, crew access, and QR join experience.",
    href: "/contact-card",
    tone: "default",
  },
  {
    eyebrow: "Identity Layer",
    title: "Profile",
    description: "Save your info, vibe, city, and emergency contacts.",
    href: "/profile",
    tone: "default",
  },
  {
    eyebrow: "Onboarding",
    title: "Join Flow",
    description: "Bring people into your TwinCore experience instantly.",
    href: "/join",
    tone: "default",
  },
] as const;

const quickLinks = [
  { label: "Join Crew", href: "/join" },
  { label: "Open Crew", href: "/crew" },
  { label: "Open Party", href: "/party" },
  { label: "Open TwinMe", href: "/twinme" },
  { label: "Open Profile", href: "/profile" },
  { label: "Contact Card", href: "/contact-card" },
];

function featureCardClass(tone: (typeof featureCards)[number]["tone"]) {
  if (tone === "blue") {
    return "border border-blue-500/20 bg-[linear-gradient(180deg,#1a1f2e,#0c0f1a)] shadow-[0_18px_50px_rgba(59,130,246,0.18)]";
  }

  if (tone === "warm") {
    return "border border-orange-500/15 bg-[linear-gradient(180deg,#22160f,#120d09)] shadow-[0_18px_50px_rgba(249,115,22,0.16)]";
  }

  return "bg-[linear-gradient(180deg,#111113,#0c0c0f)] shadow-[0_16px_45px_rgba(0,0,0,0.42)]";
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_34%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.08),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md px-4 py-8">
        <header className="mb-10">
          <div className="mb-2 text-xs font-medium tracking-[0.3em] text-white/50">
            TWINCORE
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-white/60">
            Your social, safety, and identity hub.
          </p>
        </header>

        <section className="mb-10">
          <div className="rounded-3xl border border-white/8 bg-[linear-gradient(180deg,#14141a,#0c0c10)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(255,255,255,0.03)]">
            <div className="mb-3 text-sm text-white/50">Live System</div>

            <h2 className="text-3xl font-semibold leading-tight text-white">
              Welcome back, Neo
            </h2>

            <p className="mt-4 text-white/70 leading-relaxed">
              TwinCore is active across Crew, Party Mode, TwinMe,
              Contact Card, Profile, and Join flow.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-white/80">
              <div>
                <span className="text-white/50">Vibe:</span> Calm but lit
              </div>
              <div>
                <span className="text-white/50">City:</span> London, ON
              </div>
              <div>
                <span className="text-white/50">Status:</span> Not active
              </div>
              <div>
                <span className="text-white/50">TwinMe:</span> Ready
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h3 className="mb-4 text-xl font-semibold text-white">Core Features</h3>

          <div className="grid grid-cols-2 gap-4">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-3xl p-5 transition duration-200 hover:scale-[1.02] active:scale-[0.97] ${featureCardClass(
                  card.tone
                )}`}
              >
                <div className="mb-2 text-xs text-white/50">{card.eyebrow}</div>
                <div className="text-2xl font-semibold leading-tight text-white">
                  {card.title}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="mb-4 text-xl font-semibold text-white">Quick Access</h3>

          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-2xl bg-[linear-gradient(180deg,#1A1A1F,#141419)] px-4 py-4 text-center text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.02] hover:bg-[#1d1d24] active:scale-[0.97]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="rounded-3xl bg-[linear-gradient(180deg,#111113,#0c0c0f)] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.42)]">
            <div className="mb-2 text-sm text-white/50">Safety Status</div>
            <div className="text-3xl font-semibold tracking-tight text-white">
              Monitoring
            </div>
            <p className="mt-3 text-sm leading-7 text-white/65">
              Crew, Party Mode, TwinMe guidance, and contact sharing are live.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
