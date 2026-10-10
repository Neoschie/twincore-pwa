"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { apiUrl } from "@/lib/api-url";
import { supabase } from "@/lib/supabase/client";

type Props = {
  children: ReactNode;
};

type GateState = "checking" | "signin" | "denied" | "allowed" | "error";

const REVIEW_BUILD =
  process.env.NEXT_PUBLIC_TWINCORE_NATIVE_REVIEW === "1";

export default function PrelaunchAccessGate({ children }: Props) {
  const [gateState, setGateState] = useState<GateState>(
    REVIEW_BUILD ? "checking" : "allowed",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verificationId = useRef(0);

  const verifyAccess = useCallback(async (accessToken: string) => {
    const requestId = ++verificationId.current;
    setGateState("checking");

    try {
      const response = await fetch(apiUrl("/api/prelaunch/access"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (requestId !== verificationId.current) return;

      if (response.ok) {
        const body = (await response.json()) as { allowed?: boolean };

        if (requestId !== verificationId.current) return;

        if (body.allowed === true) {
          setStatus("");
          setGateState("allowed");
          return;
        }
      }

      if (response.status === 401 || response.status === 403) {
        setGateState("denied");
        setStatus("This account is not approved for pre-launch access.");
      } else {
        setGateState("error");
        setStatus("Pre-launch access could not be verified. Please retry.");
      }
    } catch (error) {
      if (requestId !== verificationId.current) return;
      console.error("PRELAUNCH ACCESS CHECK ERROR:", error);
      setGateState("error");
      setStatus("Pre-launch access could not be verified. Please retry.");
    }
  }, []);

  useEffect(() => {
    if (!REVIEW_BUILD) {
      setGateState("allowed");
      return;
    }

    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session?.access_token) {
        ++verificationId.current;
        setStatus("");
        setGateState("signin");
        return;
      }

      void verifyAccess(session.access_token);
    });

    return () => {
      active = false;
      ++verificationId.current;
      subscription.unsubscribe();
    };
  }, [verifyAccess]);

  async function retryVerification() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      ++verificationId.current;
      setGateState("signin");
      return;
    }

    await verifyAccess(session.access_token);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!email.trim() || !password) {
      setStatus("Enter your reviewer email and password.");
      return;
    }

    setIsSubmitting(true);
    setGateState("checking");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session?.access_token) {
      setGateState("signin");
      setStatus(error?.message || "Unable to sign in.");
      setIsSubmitting(false);
      return;
    }

    // The auth state listener handles verification after sign-in.
    setIsSubmitting(false);
  }

  async function handleSignOut() {
    ++verificationId.current;
    await supabase.auth.signOut();
    setPassword("");
    setStatus("");
    setGateState("signin");
  }

  if (!REVIEW_BUILD || gateState === "allowed") {
    return <>{children}</>;
  }

  if (gateState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0A0A0B] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-blue-500/30" />
          <p className="mt-5 text-sm text-white/60">
            Verifying pre-launch access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0B] px-5 py-10 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
          TwinCore
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
          Pre-launch access
        </h1>

        {gateState === "error" ? (
          <>
            <p className="mt-3 text-sm leading-6 text-white/55">
              We couldn't verify your access. Check your connection and try again.
            </p>
            <div role="status" className="mt-5 text-sm text-white/70">
              {status}
            </div>
            <button
              type="button"
              onClick={() => void retryVerification()}
              className="mt-6 h-12 w-full rounded-2xl bg-white text-sm font-semibold text-black"
            >
              Retry verification
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="mt-4 w-full text-sm text-white/60"
            >
              Sign in with another account
            </button>
          </>
        ) : gateState === "denied" ? (
          <>
            <p className="mt-3 text-sm leading-6 text-white/55">
              This build is limited to approved pre-launch reviewers.
            </p>

            {status ? (
              <div
                role="status"
                className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70"
              >
                {status}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="mt-6 h-12 w-full rounded-2xl bg-white text-sm font-semibold text-black"
            >
              Sign in with another account
            </button>
          </>
        ) : (
          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-white/55">
              Sign in with the reviewer account provided for this build.
            </p>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-white/45">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-white/45">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
              />
            </label>

            {status ? (
              <div
                role="status"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70"
              >
                {status}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-2xl bg-white text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
