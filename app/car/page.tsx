"use client";

import { useEffect, useMemo, useState } from "react";
import CarClient from "./ui";

export default function CarPage() {
  const [flow, setFlow] = useState("party");
  const [stage, setStage] = useState("menu");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFlow(params.get("flow") ?? "party");
    setStage(params.get("stage") ?? "menu");
  }, []);

  const safeFlow = useMemo(() => (flow ? flow : "party"), [flow]);
  const safeStage = useMemo(() => (stage ? stage : "menu"), [stage]);

  return <CarClient flow={safeFlow} stage={safeStage} />;
}