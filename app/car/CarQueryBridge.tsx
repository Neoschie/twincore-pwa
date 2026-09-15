"use client";

import { useSearchParams } from "next/navigation";
import CarClient from "./ui";

export default function CarQueryBridge() {
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow") || "party";
  const stage = searchParams.get("stage") || "menu";

  return <CarClient flow={flow} stage={stage} />;
}
