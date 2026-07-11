import Link from "next/link";
import { EyeOff, Lock } from "lucide-react";
import {
  MapPin,
  Users,
  UserPlus,
  PartyPopper,
  Brain,
  User,
} from "lucide-react";

const iconMap = {
  Spots: MapPin,
  Crew: Users,
  "Invite Crew": UserPlus,
  "Party Mode": PartyPopper,
  TwinMe: Brain,
  Profile: User,

};

const Icon = iconMap[card.title as keyof typeof iconMap];

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
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Core</h3>

        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
          {spotsStatusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {features.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`rounded-3xl p-5 transition hover:scale-[1.02] active:scale-[0.98] ${getToneClass(
              card.tone
            )} ${card.title === "Spots" ? "ring-1 ring-cyan-300/20" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-2xl font-semibold">
  {Icon ? <Icon className="h-5 w-5" /> : null}
  {card.title}
</div>

              {card.title === "Spots" && (
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/85">
                    <EyeOff className="h-3 w-3" />
                    {ghostMode ? "Ghost" : "Map"}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/85">
                    <Lock className="h-3 w-3" />
                    {trustedOnly ? "Trusted" : "Open"}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-3 text-sm leading-6 text-white/60">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}