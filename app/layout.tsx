import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConditionalTwinMeGlobal from "./ConditionalTwinMeGlobal";
import { PresenceProvider } from "@/components/twincore/PresenceProvider";
import RecommendationLearningRuntime from "@/components/twincore/RecommendationLearningRuntime";
import RecommendationAdaptationRuntime from "@/components/twincore/RecommendationAdaptationRuntime";
import RecommendationAdaptationConsumptionRuntime from "@/components/twincore/RecommendationAdaptationConsumptionRuntime";
import LifeContextRuntime from "@/components/twincore/LifeContextRuntime";
import NativeDeepLinkRuntime from "@/components/twincore/NativeDeepLinkRuntime";
import TwinCoreNavigation from "@/components/twincore/ui/TwinCoreNavigation";

export const metadata: Metadata = {
  title: "TwinCore",
  description: "Your social, safety, and identity hub.",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0A0A0B]">
      <body className="min-h-screen bg-[#0A0A0B] text-white antialiased">
        <PresenceProvider>
          <RecommendationLearningRuntime />
          <RecommendationAdaptationRuntime />
          <RecommendationAdaptationConsumptionRuntime />
          <LifeContextRuntime />
          <NativeDeepLinkRuntime />
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 z-0">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#09090B_0%,#0A0A0B_45%,#09090B_100%)]" />
              <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl animate-pulse" />
              <div className="absolute bottom-[-6rem] left-[-4rem] h-64 w-64 rounded-full bg-orange-500/8 blur-3xl animate-pulse" />
              <div className="absolute right-[-5rem] top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/6 blur-3xl animate-pulse" />
            </div>

            <TwinCoreNavigation />

            <div className="twincore-app-content relative z-10 min-h-screen w-full">
              {children}
            </div>

            <ConditionalTwinMeGlobal />
          </div>
        </PresenceProvider>
      </body>
    </html>
  );
}
