import Link from "next/link";

const featureCards = [
  {
    eyebrow: "Social Layer",
    title: "Crew Radar",
    description: "Invite crew, join with code, and view live crew activity.",
    href: "/crew",
  },
  {
    eyebrow: "Activity Layer",
    title: "Party Mode",
    description: "Broadcast statuses like Outside, At club, Safe, or Heading home.",
    href: "/party",
  },
  {
    eyebrow: "Guidance Layer",
    title: "TwinMe",
    description: "Live insight, grounding cues, and smarter next-step decisions.",
    href: "/twinme",
  },
  {
    eyebrow: "Sharing Layer",
    title: "Contact Card",
    description: "Share your identity, crew access, and QR join experience.",
    href: "/contact-card",
  },
  {
    eyebrow: "Identity Layer",
    title: "Profile",
    description: "Save your info, vibe, city, and emergency contacts.",
    href: "/profile",
  },
  {
    eyebrow: "Onboarding",
    title: "Join Flow",
    description: "Bring people into your TwinCore experience instantly.",
    href: "/join",
  },
];

const quickLinks = [
  { label: "Join Crew", href: "/join" },
  { label: "Open Crew", href: "/crew" },
  { label: "Open Party", href: "/party" },
  { label: "Open TwinMe", href: "/twinme" },
  { label: "Open Profile", href: "/profile" },
  { label: "Contact Card", href: "/contact-card" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="mx-auto w-full max-w-md px-4 py-8">

        {/* HEADER */}
        <header className="mb-10">
          <div className="text-xs tracking-[0.3em] text-white/50 mb-2">
            TWINCORE
          </div>
          <h1 className="text-4xl font-semibold">Dashboard</h1>
          <p className="text-white/60 mt-2">
            Your social, safety, and identity hub.
          </p>
        </header>

        {/* HERO */}
        <section className="mb-10">
          <div className="rounded-3xl bg-[#111113] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="text-sm text-white/50 mb-2">Live System</div>

            <h2 className="text-3xl font-semibold leading-tight">
              Welcome back, Neo
            </h2>

            <p className="mt-4 text-white/70 leading-relaxed">
              TwinCore is active across Crew, Party Mode, TwinMe,
              Contact Card, Profile, and Join flow.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-white/80">
              <div><span className="text-white/50">Vibe:</span> Calm but lit</div>
              <div><span className="text-white/50">City:</span> London, ON</div>
              <div><span className="text-white/50">Status:</span> Not active</div>
              <div><span className="text-white/50">TwinMe:</span> Ready</div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold mb-4">Core Features</h3>

          <div className="grid grid-cols-2 gap-4">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-2xl bg-[#111113] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] active:scale-[0.98]"
              >
                <div className="text-xs text-white/50 mb-2">
                  {card.eyebrow}
                </div>

                <div className="text-lg font-semibold">
                  {card.title}
                </div>

                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* QUICK ACCESS */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold mb-4">Quick Access</h3>

          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl bg-[#1A1A1F] py-4 text-center text-sm font-medium text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)] active:scale-[0.97]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* STATUS */}
        <section>
          <div className="rounded-2xl bg-[#111113] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="text-sm text-white/50 mb-2">Safety Status</div>
            <div className="text-2xl font-semibold">Monitoring</div>

            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Crew, Party Mode, TwinMe guidance, and contact sharing are live.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
