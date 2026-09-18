"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { getSharedProfile, upsertSharedProfile } from "@/lib/shared-profile";
import { hasCompletedOnboarding } from "@/lib/onboarding-state";
import { resolvePostAuthPath, sanitizeNextPath } from "@/lib/auth-flow";

function getRequestedNextPath() {
  if (typeof window === "undefined") return null;

  return sanitizeNextPath(
    new URLSearchParams(window.location.search).get("next"),
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleAuth() {
    setStatus("");

    if (mode === "signup" && !displayName.trim()) {
      setStatus("Enter the name you want your crew to see.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setStatus("Enter your email and password.");
      return;
    }

    setIsLoading(true);

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

    if (result.error) {
      setStatus(result.error.message);
      setIsLoading(false);
      return;
    }

    const user = result.data.user;

    if (user) {
      let resolvedDisplayName = displayName.trim();

      if (mode === "signin") {
        try {
          const sharedProfile = await getSharedProfile(user.id);

          if (sharedProfile?.display_name?.trim()) {
            resolvedDisplayName = sharedProfile.display_name.trim();
          }
        } catch (profileError) {
          console.error("SHARED PROFILE LOOKUP ERROR:", profileError);
        }

        if (!resolvedDisplayName) {
          try {
            const raw = localStorage.getItem(
              `twincore_profile_${user.id}`,
            );

            if (raw) {
              const parsed = JSON.parse(raw) as {
                displayName?: string;
              };

              resolvedDisplayName =
                parsed.displayName?.trim() || "";
            }
          } catch {
            resolvedDisplayName = "";
          }
        }
      }

      if (resolvedDisplayName) {
        const profileKey = `twincore_profile_${user.id}`;

        let existingProfile: Record<string, unknown> = {};

        try {
          const raw = localStorage.getItem(profileKey);

          if (raw) {
            existingProfile = JSON.parse(raw) as Record<string, unknown>;
          }
        } catch {
          existingProfile = {};
        }

        localStorage.setItem(
          profileKey,
          JSON.stringify({
            ...existingProfile,
            displayName: resolvedDisplayName,
          }),
        );

        localStorage.setItem(
          `twincore_display_name_${user.id}`,
          resolvedDisplayName,
        );

        try {
          await upsertSharedProfile({
            userId: user.id,
            displayName: resolvedDisplayName,
          });
        } catch (profileError) {
          console.error(
            "SHARED PROFILE SAVE ERROR:",
            profileError,
          );
        }
      }
    }

    if (mode === "signup") {
      localStorage.removeItem("twincore_onboarding_complete");
    }

    alert(`Logged in as: ${user?.email}`);
    if (user) {
      posthog.identify(user.id, { email: user.email });
      if (mode === "signup") {
        posthog.capture("user_signed_up", { email: user.email });
      } else {
        posthog.capture("user_signed_in", { email: user.email });
      }
    }

    setStatus(
  mode === "signup"
    ? "Account created successfully."
    : "Signed in successfully."
);

const isSignup = mode === "signup";

// supabase sign up/sign in logic happens here

setIsLoading(false);

const {
  data: { user: currentUser },
} = await supabase.auth.getUser();


const completedOnboarding =
  hasCompletedOnboarding(currentUser);

if (completedOnboarding) {
  localStorage.setItem("twincore_onboarding_complete", "true");
}

router.push(
  resolvePostAuthPath({
    mode: isSignup ? "signup" : "signin",
    requestedPath: getRequestedNextPath(),
    onboardingComplete: completedOnboarding,
  }),
);

  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070A] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-16rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-violet-500/[0.08] blur-[120px]"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <section className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-white/60 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
              TWINCORE
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              Welcome to TwinCore
            </p>

            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Your life,
              <span className="block text-white/55">in sync.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              One identity across TwinMe, Crew, Spots, Party, Safety, and the
              moments that matter next.
            </p>

            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["01", "Your identity"],
                ["02", "Your people"],
                ["03", "Your next move"],
              ].map(([number, label]) => (
                <div
                  key={number}
                  className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.035] px-4 py-4 backdrop-blur-xl"
                >
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-white/30">
                    {number}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/75">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
              />

              <div className="mb-7">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Your identity
                </div>

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                  {mode === "signup" ? "Create your TwinCore." : "Welcome back."}
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  {mode === "signup"
                    ? "Start with the identity your Crew will know."
                    : "Sign in and return to your TwinCore experience."}
                </p>
              </div>

              <div className="space-y-4">
                {mode === "signup" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-white/45">
                      Display name
                    </span>
                    <input
                      type="text"
                      placeholder="How should your Crew know you?"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      autoComplete="name"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/35 focus:bg-white/[0.04]"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-white/45">
                    Email
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/35 focus:bg-white/[0.04]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-white/45">
                    Password
                  </span>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/35 focus:bg-white/[0.04]"
                  />
                </label>

                <div className="pt-2">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/30">
                    Enter the experience
                  </div>

                  <button
                    type="button"
                    onClick={handleAuth}
                    disabled={isLoading}
                    className="h-14 w-full rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading
                      ? "Please wait..."
                      : mode === "signup"
                        ? "Create Account"
                        : "Sign In"}
                  </button>
                </div>
              </div>

              {status && (
                <div
                  role="status"
                  className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/75"
                >
                  {status}
                </div>
              )}

              <div className="mt-6 border-t border-white/[0.08] pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setMode((prev) =>
                      prev === "signup" ? "signin" : "signup"
                    )
                  }
                  className="text-sm font-medium text-white/50 transition hover:text-white/80"
                >
                  {mode === "signup"
                    ? "Already have an account? Sign in"
                    : "New to TwinCore? Create an account"}
                </button>
              </div>

              <p className="mt-6 text-xs leading-5 text-white/25">
                Your TwinCore identity keeps your experience connected across
                the ecosystem.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
