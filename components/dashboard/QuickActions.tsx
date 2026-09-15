import Link from "next/link";
import {
  ArrowUpRight,
  Brain,
  EyeOff,
  Lock,
  MapPin,
  PartyPopper,
  User,
  UserPlus,
  Users,
} from "lucide-react";

const iconMap = {
  Spots: MapPin,
  Crew: Users,
  "Invite Crew": UserPlus,
  "Party Mode": PartyPopper,
  TwinMe: Brain,
  Profile: User,
};

const visualMap = {
  Spots: {
    aura: "bg-cyan-400/15",
    icon: "text-cyan-100",
    iconSurface: "border-cyan-300/20 bg-cyan-300/10",
    line: "from-cyan-300/80 via-cyan-400/30 to-transparent",
  },
  Crew: {
    aura: "bg-blue-500/16",
    icon: "text-blue-100",
    iconSurface: "border-blue-300/20 bg-blue-400/10",
    line: "from-blue-300/80 via-blue-500/30 to-transparent",
  },
  "Invite Crew": {
    aura: "bg-violet-500/15",
    icon: "text-violet-100",
    iconSurface: "border-violet-300/20 bg-violet-400/10",
    line: "from-violet-300/80 via-violet-500/30 to-transparent",
  },
  "Party Mode": {
    aura: "bg-orange-500/16",
    icon: "text-orange-100",
    iconSurface: "border-orange-300/20 bg-orange-400/10",
    line: "from-orange-300/80 via-fuchsia-500/25 to-transparent",
  },
  TwinMe: {
    aura: "bg-fuchsia-500/15",
    icon: "text-fuchsia-100",
    iconSurface: "border-fuchsia-300/20 bg-fuchsia-400/10",
    line: "from-fuchsia-300/80 via-violet-500/30 to-transparent",
  },
  Profile: {
    aura: "bg-emerald-500/12",
    icon: "text-emerald-100",
    iconSurface: "border-emerald-300/18 bg-emerald-400/8",
    line: "from-emerald-300/70 via-cyan-500/20 to-transparent",
  },
} as const;

type FeatureCard = {
  title: string;
  description: string;
  href: string;
  tone: string;
};

type Props = {
  features: readonly FeatureCard[];
  getToneClass: (tone: string) => string;
  spotsStatusText: string;
  ghostMode: boolean;
  trustedOnly: boolean;
};

export function QuickActions({
  features,
  getToneClass,
  spotsStatusText,
  ghostMode,
  trustedOnly,
}: Props) {
  return (
    <section className="mb-6">
      <div className="mb-3.5 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-100/38">
            TwinCore ecosystem
          </p>

          <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-white">
            Your world
          </h3>
        </div>

        <span className="max-w-[48%] truncate text-[9px] font-bold uppercase tracking-[0.14em] text-white/25">
          {spotsStatusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {features.map((card) => {
          const Icon =
            iconMap[card.title as keyof typeof iconMap];

          const visual =
            visualMap[card.title as keyof typeof visualMap];

          return (
            <Link
              key={card.title}
              href={card.href}
              className={`group relative min-h-[145px] overflow-hidden rounded-[1.65rem] p-4 transition duration-300 hover:-translate-y-1 hover:brightness-110 active:scale-[0.985] ${getToneClass(
                card.tone
              )}`}
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition duration-300 group-hover:scale-125 ${
                  visual?.aura || "bg-white/5"
                }`}
              />

              <div
                className={`pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r ${
                  visual?.line || "from-white/40 to-transparent"
                }`}
              />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-[0.9rem] border shadow-[0_0_22px_rgba(255,255,255,0.025)] ${
                      visual?.iconSurface ||
                      "border-white/10 bg-white/[0.06]"
                    }`}
                  >
                    {Icon ? (
                      <Icon
                        className={`h-[18px] w-[18px] ${
                          visual?.icon || "text-white"
                        }`}
                      />
                    ) : null}
                  </span>

                  <ArrowUpRight className="h-4 w-4 text-white/18 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/65" />
                </div>

                <div className="mt-4">
                  <div className="text-[15px] font-black tracking-[-0.025em] text-white">
                    {card.title}
                  </div>

                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/38">
                    {card.description}
                  </p>
                </div>

                {card.title === "Spots" ? (
                  <div className="mt-auto flex gap-2 pt-3">
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-100/38">
                      <EyeOff className="h-2.5 w-2.5" />
                      {ghostMode ? "Ghost" : "Map"}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-100/38">
                      <Lock className="h-2.5 w-2.5" />
                      {trustedOnly ? "Trusted" : "Open"}
                    </span>
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
