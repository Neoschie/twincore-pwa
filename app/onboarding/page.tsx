"use client";

import Link from "next/link";
import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { startSubscriptionPurchase } from "@/lib/subscription/purchase";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
const [selectedMood, setSelectedMood] = useState("");

  return (
<main className="relative min-h-screen overflow-y-auto overflow-x-hidden bg-[#07070A] text-white flex items-start justify-center px-5 py-10">
<div className="absolute inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-[-120px] left-[-80px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-3xl" />

  <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-3xl" />

  <div className="absolute top-[35%] left-[50%] h-[180px] w-[180px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-2xl" />
</div>
<div className="relative z-10 w-full max-w-md pb-40">
        <div className="mb-8 flex justify-center">
  <div className="relative">
    <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl animate-pulse" />

    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-xl">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 shadow-[0_0_40px_rgba(103,232,249,0.35)]" />
    </div>
  </div>
</div>

<div className="mb-6 flex items-center justify-center gap-2">
  {[1, 2, 3, 4, 5].map((item) => (
    <div
      key={item}
      className={`h-2 rounded-full transition-all duration-300 ${
        step === item
          ? "w-8 bg-white"
          : "w-2 bg-white/20"
      }`}
    />
  ))}
</div>

<AnimatePresence mode="wait">

        {step === 1 && (
  <motion.section
    key="step-1"
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.98 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
    className="rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_0_40px_rgba(255,255,255,0.03)] p-6 mb-8"
  >
            <div className="mb-8">
              <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                TwinCore • TwinMe
              </div>

<h1 className="max-w-[12ch] text-4xl font-semibold leading-tight tracking-tight">                TwinMe notices patterns before things spiral.
              </h1>

              <p className="mt-4 text-sm leading-6 text-white/60">
                Adaptive support that responds to your movement, environment,
                energy, and social state in real time.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-14 rounded-2xl bg-white text-black font-semibold"
              >
                Start Sync
              </button>

              <Link
                href="/twinme"
                className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/70"
              >
                Explore First
              </Link>
            </div>
          </motion.section>
        )}

{step === 2 && (
  <motion.section
    key="step-2"
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.98 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
    className="rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-3xl shadow-[0_0_40px_rgba(255,255,255,0.03)] p-6 mb-8"
  >
    <h2 className="text-2xl font-semibold">
      How does tonight feel so far?
    </h2>

    <p className="mt-2 text-sm text-white/55">
      Pick the closest one. TwinMe will tune its first response.
    </p>

    <div className="mt-6 grid grid-cols-1 gap-3">
      {[
        { label: "Calm", sub: "Steady • grounded • clear" },
        { label: "Social", sub: "Connected • active • open" },
        { label: "Unsure", sub: "Unclear • hesitant • uncertain" },
        { label: "Overwhelming", sub: "Too much • overstimulated • heavy" },
        { label: "Drifting", sub: "Unfocused • wandering • disconnected" },
        { label: "Just Checking In", sub: "No issue — just syncing" },
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
  setSelectedMood(item.label);
  setStep(3);
}}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 active:scale-[0.99] transition"
        >
          <div className="font-medium">{item.label}</div>
          <div className="mt-1 text-xs text-white/45">{item.sub}</div>
        </button>
      ))}
    </div>

    <button
      type="button"
      onClick={() => setStep(1)}
      className="mt-6 text-sm text-white/50 underline"
    >
      Back
    </button>
  </motion.section>
)}

{step === 3 && (
    <motion.section
    key="step-3"
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.98 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
  className="rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_0_40px_rgba(255,255,255,0.03)] p-6 mb-8">
    <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
      TwinMe Active
    </div>

    <h2 className="text-2xl font-semibold leading-tight">
      TwinMe is syncing to your state.
    </h2>

    <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-white/40">
        TwinMe
      </div>

      <div className="mt-4 text-base leading-7 text-white/90">
        {selectedMood === "Calm" &&
          "Good. Let's keep the night intentional instead of reactive."}

        {selectedMood === "Social" &&
          "Stay connected, but keep awareness ahead of momentum."}

        {selectedMood === "Unsure" &&
          "You don't need a full answer yet. Let's keep the next move simple."}

        {selectedMood === "Overwhelming" &&
          "You do not need to solve everything tonight. Slow the next move down first."}

        {selectedMood === "Drifting" &&
          "Drift becomes risk when movement loses direction. Choose one stable move before things scatter."}

        {selectedMood === "Just Checking In" &&
          "Understood. I'll stay aware quietly unless you need me."}
      </div>
    </div>

    <button
      type="button"
      onClick={() => setStep(4)}
      className="mt-6 w-full h-14 rounded-2xl bg-white text-black font-semibold"
    >
      Continue
    </button>

    <button
      type="button"
      onClick={() => setStep(2)}
      className="mt-4 text-sm text-white/50 underline"
    >
      Back
    </button>
  </motion.section>
)}

{step === 4 && (
    <motion.section
    key="step-4"
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.98 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
  className="rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_0_40px_rgba(255,255,255,0.03)] p-6 mb-8">
    <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
      Live Awareness
    </div>

    <h2 className="text-2xl font-semibold leading-tight">
      TwinMe continuously adapts as things change.
    </h2>

    <p className="mt-3 text-sm leading-6 text-white/55">
      Movement, support, pacing, uncertainty, and environmental shifts all shape how TwinMe responds.
    </p>

    <div className="mt-8 grid grid-cols-2 gap-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/45">Awareness</div>
        <div className="mt-2 text-xl font-semibold">
          Stable
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/45">Movement</div>
        <div className="mt-2 text-xl font-semibold">
          Controlled
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/45">Support</div>
        <div className="mt-2 text-xl font-semibold">
          Available
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/45">Environment</div>
        <div className="mt-2 text-xl font-semibold">
          Low Risk
        </div>
      </div>
    </div>

    <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-white/40">
        TwinMe
      </div>

      <p className="mt-3 text-sm leading-7 text-white/85">
        TwinMe continuously adapts to movement, support, pacing, uncertainty, and environmental shifts in real time.
      </p>
    </div>

    <button
      type="button"
      onClick={() => setStep(5)}
      className="mt-8 w-full h-14 rounded-2xl bg-white text-black font-semibold"
    >
      Continue
    </button>

    <button
      type="button"
      onClick={() => setStep(3)}
      className="mt-4 text-sm text-white/50 underline"
    >
      Back
    </button>
  </motion.section>
)}

 {step === 5 && (
  <motion.section
    key="step-5"
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.98 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
    className="rounded-[2rem] border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_0_40px_rgba(255,255,255,0.03)] p-6 mb-8"
  >
    <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
      TwinCore Access
    </div>

    <h2 className="text-2xl font-semibold leading-tight">
      Unlock full adaptive awareness.
    </h2>

    <p className="mt-3 text-sm leading-6 text-white/55">
      Continuous guidance, predictive awareness, ecosystem syncing, hands-free support, and advanced TwinMe intelligence.
    </p>

    <div className="mt-7 space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Premium</div>
            <p className="mt-1 text-xs leading-5 text-white/50">
              Full TwinMe intelligence, unlimited voice, ecosystem awareness, and advanced guidance.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xl font-semibold">$24.99</div>
            <div className="text-xs text-white/45">USD/month</div>
          </div>
        </div>

        <button
  type="button"
 
  onClick={async () => {
  const result = await startSubscriptionPurchase("premium");

  if (result.success && result.redirectTo) {
    localStorage.setItem("twincore_onboarding_complete", "true");
    window.location.href = result.redirectTo;
  }
}}

  className="mt-5 w-full h-12 rounded-2xl bg-white text-black text-sm font-semibold"
>
  Start Premium
</button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="text-lg font-semibold">Party Pass</div>

        <p className="mt-2 text-sm leading-6 text-white/65">
          Going out tonight? Activate the full TwinCore experience for 24 hours.
        </p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-xl font-semibold">$5.99</div>
            <div className="text-xs text-white/45">USD • 24-hour access</div>
          </div>

         <button
  type="button"
 
  onClick={async () => {
  const result = await startSubscriptionPurchase("party_pass");

  if (result.success && result.redirectTo) {
    localStorage.setItem("twincore_onboarding_complete", "true");
    window.location.href = result.redirectTo;
  }
}}

  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85"
>
  Try Party Pass
</button>
        </div>
      </div>
    </div>

    <div className="mt-6 grid grid-cols-1 gap-3">
     <button
  type="button"
  onClick={() => {
    localStorage.setItem("twincore_onboarding_complete", "true");
    window.location.href = "/twinme";
  }}
  className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80"
>
  Continue Free
</button>

      <button
        type="button"
        onClick={() => setStep(4)}
        className="text-sm text-white/50 underline"
      >
        Back
      </button>
    </div>
  </motion.section>
)}

</AnimatePresence>

      </div>
    </main>
  );
}