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
    description: "Get live social insight, grounding cues, and smarter next-step support.",
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
    description: "Save your name, vibe, city, music, and emergency contact info.",
    href: "/profile",
  },
  {
    eyebrow: "Onboarding Layer",
    title: "Join Flow",
    description: "Bring people into your TwinCore experience with a simple invite path.",
    href: "/join",
  },
];

const quickLinks = [
  { label: "Join Crew", href: "/join" },
  { label: "Open Crew", href: "/crew" },
  { label: "Open Party", href: "/party" },
  { label: "Open TwinMe", href: "/twinme" },
  { label: "Open Profile", href: "/profile" },
  { label: "Open Contact Card", href: "/contact-card" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 sm:mb-10">
          <div className="mb-2 text-sm font-medium text-white/55">TwinCore</div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 text-lg text-white/65">
            Your social, safety, and identity hub.
          </p>
        </header>

        <section className="mb-8">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,25,0.96),rgba(10,10,14,0.98))] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="mb-3 text-sm font-medium text-white/55">Live System</div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome back, Neo
            </h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">
              TwinCore is active and connected across Crew, Party Mode, TwinMe,
              Contact Card, Profile, and Join flow.
            </p>

            <div className="mt-6 grid gap-3 text-base text-white/85 sm:grid-cols-2">
              <div>
                <span className="font-semibold text-white">Vibe:</span> Calm but lit
              </div>
              <div>
                <span className="font-semibold text-white">City:</span> London, ON
              </div>
              <div>
                <span className="font-semibold text-white">Live status:</span> Not active
              </div>
              <div>
                <span className="font-semibold text-white">TwinMe:</span> Ready
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-4 text-2xl font-semibold tracking-tight text-white">
            Core Features
          </h3>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-[1.75rem] border border-white/10 bg-[#111113] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.32)] transition duration-200 hover:-translate-y-[2px] hover:bg-[#151519]"
              >
                <div className="mb-3 text-sm font-medium text-white/50">{card.eyebrow}</div>
                <div className="text-2xl font-semibold tracking-tight text-white">
                  {card.title}
                </div>
                <p className="mt-3 text-lg leading-8 text-white/75">{card.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-4 text-2xl font-semibold tracking-tight text-white">
            Quick Access
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-[#151519] px-5 py-4 text-lg font-medium text-white transition duration-200 hover:bg-[#1b1b21]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="rounded-[1.75rem] border border-white/10 bg-[#111113] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.32)]">
            <div className="mb-3 text-sm font-medium text-white/55">Safety Status</div>
            <div className="text-3xl font-semibold tracking-tight text-white">
              Monitoring
            </div>
            <p className="mt-3 text-lg leading-8 text-white/75">
              Contact Card, Crew access, Party updates, TwinMe guidance, and Join flow
              are all live in your MVP.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
