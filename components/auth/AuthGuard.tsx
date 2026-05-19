"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth");
        return;
      }

      setIsChecking(false);
    };

    checkSession();
  }, [router]);

 if (isChecking) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070A] text-white flex items-center justify-center px-5">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-80px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl animate-pulse" />

          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-xl">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 shadow-[0_0_40px_rgba(103,232,249,0.35)]" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] px-6 py-5 backdrop-blur-3xl shadow-[0_0_40px_rgba(255,255,255,0.03)]">
          <div className="mb-2 text-xs tracking-[0.3em] text-white/40">
            TWINCORE
          </div>

          <div className="text-sm font-medium text-white/80">
            Syncing your session...
          </div>

          <div className="mt-2 text-xs text-white/45">
            Checking access and restoring your state.
          </div>
        </div>
      </div>
    </main>
  );
}

  return <>{children}</>;
}