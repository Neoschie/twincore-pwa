"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

function resolveNativePath(url: string): string | null {
  try {
    const parsed = new URL(url);

    let pathname: string;

    if (parsed.protocol === "https:" && parsed.hostname === "twincore.co") {
      pathname = parsed.pathname;
    } else if (parsed.protocol === "twincore:") {
      const parts = [
        parsed.hostname,
        ...parsed.pathname.split("/").filter(Boolean),
      ].filter(Boolean);

      pathname = `/${parts.join("/")}`;
    } else {
      return null;
    }

    const inviteMatch = pathname.match(/^\/invite\/([^/]+)$/);
    if (inviteMatch) {
      return `/invite/__native__?code=${encodeURIComponent(decodeURIComponent(inviteMatch[1]))}`;
    }

    const spotMatch = pathname.match(/^\/spots\/([^/]+)$/);
    if (spotMatch) {
      return `/spots/__native__?placeId=${encodeURIComponent(decodeURIComponent(spotMatch[1]))}`;
    }

    return `${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export default function NativeDeepLinkRuntime() {
  const router = useRouter();

  useEffect(() => {
    const isNativeIos =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

    document.documentElement.classList.toggle(
      "twincore-native-ios",
      isNativeIos,
    );

    if (!Capacitor.isNativePlatform()) {
      return () => {
        document.documentElement.classList.remove("twincore-native-ios");
      };
    }

    let active = true;

    const navigate = (url: string) => {
      const target = resolveNativePath(url);
      if (active && target) {
        router.push(target);
      }
    };

    void App.getLaunchUrl().then((result) => {
      if (result?.url) {
        navigate(result.url);
      }
    });

    const listenerPromise = App.addListener("appUrlOpen", ({ url }) => {
      navigate(url);
    });

    return () => {
      active = false;
      document.documentElement.classList.remove("twincore-native-ios");
      void listenerPromise.then((listener) => listener.remove());
    };
  }, [router]);

  return null;
}
