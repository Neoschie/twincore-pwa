import { Capacitor } from "@capacitor/core";

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://twincore.co").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return Capacitor.isNativePlatform()
    ? `${APP_ORIGIN}${normalizedPath}`
    : normalizedPath;
}
