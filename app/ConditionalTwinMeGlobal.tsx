"use client";

import { usePathname } from "next/navigation";
import TwinMeGlobal from "./twinme/global";

export default function ConditionalTwinMeGlobal() {
  const pathname = usePathname();

  /*
   * TwinMe owns the full visual experience on /twinme,
   * so the compact global presence stays hidden there.
   */
  if (
    pathname === "/twinme" ||
    pathname.startsWith("/twinme/")
  ) {
    return null;
  }

  if (pathname === "/") {
    return null;
  }

  return <TwinMeGlobal />;
}
