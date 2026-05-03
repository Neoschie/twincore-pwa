"use client";

import { usePathname } from "next/navigation";
import TwinMeGlobal from "./twinme/global";

export default function ConditionalTwinMeGlobal() {
  const pathname = usePathname();

  if (pathname === "/twinme") return null;

  return <TwinMeGlobal />;
}