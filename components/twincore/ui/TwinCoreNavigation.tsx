"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Home,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof Home;
};

const primaryNavigation: NavigationItem[] = [
  {
    href: "/",
    label: "FYI Today",
    shortLabel: "FYI",
    icon: Home,
  },
  {
    href: "/spots",
    label: "Spots",
    shortLabel: "Spots",
    icon: MapPin,
  },
  {
    href: "/crew",
    label: "Crew",
    shortLabel: "Crew",
    icon: Users,
  },
  {
    href: "/party",
    label: "Party",
    shortLabel: "Party",
    icon: Zap,
  },
  {
    href: "/twinme",
    label: "TwinMe",
    shortLabel: "TwinMe",
    icon: Brain,
  },
];

function routeIsActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function hideNavigation(pathname: string) {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname.startsWith("/invite/")
  );
}

export default function TwinCoreNavigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (hideNavigation(pathname)) {
    return null;
  }

  return (
    <>
      <div className="twincore-desktop-nav">
        <nav
          aria-label="Primary navigation"
          className="twincore-desktop-nav-inner"
        >
          <Link href="/" className="twincore-nav-brand">
            <span className="twincore-nav-brand-mark">
              <Sparkles aria-hidden="true" />
            </span>

            <span className="twincore-nav-brand-copy">
              <strong>TwinCore</strong>
              <small>LIVE OS</small>
            </span>
          </Link>

          <div className="twincore-desktop-nav-links">
            {primaryNavigation.map((item) => {
              const active = routeIsActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`twincore-desktop-nav-link ${
                    active ? "is-active" : ""
                  }`}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="twincore-nav-actions">
            <Link
              href="/safety"
              aria-label="Safety"
              className={`twincore-nav-icon-button ${
                routeIsActive(pathname, "/safety") ? "is-active" : ""
              }`}
            >
              <ShieldCheck aria-hidden="true" />
            </Link>

            <Link
              href="/profile"
              aria-label="Profile"
              className={`twincore-nav-avatar ${
                routeIsActive(pathname, "/profile") ? "is-active" : ""
              }`}
            >
              <UserRound aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </div>

      <div className="twincore-mobile-nav">
        <div className="twincore-mobile-nav-shell">
          <nav
            aria-label="Mobile primary navigation"
            className="twincore-mobile-nav-inner"
          >
            {primaryNavigation.map((item) => {
              const active = routeIsActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`twincore-mobile-nav-link ${
                    active ? "is-active" : ""
                  }`}
                >
                  <span className="twincore-mobile-nav-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span>{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            aria-label={moreOpen ? "Close more navigation" : "Open more navigation"}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((current) => !current)}
            className={`twincore-mobile-more-trigger ${
              moreOpen ? "is-active" : ""
            }`}
          >
            {moreOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </button>
        </div>

        {moreOpen ? (
          <div className="twincore-mobile-more">
            <div className="twincore-mobile-more-heading">
              <div>
                <span>TWINCORE</span>
                <strong>More</strong>
              </div>

              <button
                type="button"
                aria-label="Close more navigation"
                onClick={() => setMoreOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="twincore-mobile-more-grid">
              <Link href="/profile">
                <UserRound aria-hidden="true" />
                <span>
                  <strong>Profile</strong>
                  <small>Identity & setup</small>
                </span>
              </Link>

              <Link href="/safety">
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>Safety</strong>
                  <small>Safety journeys</small>
                </span>
              </Link>

              <Link href="/contact-card">
                <Sparkles aria-hidden="true" />
                <span>
                  <strong>Contact Card</strong>
                  <small>Share your identity</small>
                </span>
              </Link>

              <Link href="/join">
                <Users aria-hidden="true" />
                <span>
                  <strong>Join Crew</strong>
                  <small>Connect with people</small>
                </span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
