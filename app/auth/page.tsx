"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleAuth() {
    setStatus("");

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

    setStatus(
  mode === "signup"
    ? "Account created successfully."
    : "Signed in successfully."
);

setIsLoading(false);

const completedOnboarding =
  localStorage.getItem("twincore_onboarding_complete") === "true";

router.push(
  completedOnboarding
    ? "/twinme"
    : "/onboarding"
);
  }

  return (
    <main className="min-h-screen bg-[#07070A] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
        <div className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            TwinCore Auth
          </div>

          <h1 className="text-3xl font-semibold">
            {mode === "signup" ? "Create account" : "Welcome back"}
          </h1>

          <p className="mt-2 text-sm text-white/55">
            Sync your TwinCore experience securely.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-white/30"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-white/30"
          />

          <button
            type="button"
            onClick={handleAuth}
            disabled={isLoading}
            className="h-14 w-full rounded-2xl bg-white text-black font-semibold disabled:opacity-50"
          >
            {isLoading
              ? "Please wait..."
              : mode === "signup"
              ? "Create Account"
              : "Sign In"}
          </button>
        </div>

        {status && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
            {status}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setMode((prev) =>
              prev === "signup" ? "signin" : "signup"
            )
          }
          className="mt-6 text-sm text-white/55 underline"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </button>
      </div>
    </main>
  );
}