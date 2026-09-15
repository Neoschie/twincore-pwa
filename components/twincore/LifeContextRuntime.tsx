"use client";

// TWINCORE_LIFE_CONTEXT_FIRST_PRODUCER_R15_5
//
// First verified producer for canonical Life Context.
//
// Tonight Context remains authoritative over its own state.
// This runtime mirrors only meaningful, known Tonight evidence
// into canonical Life Context.
//
// UNKNOWN remains UNKNOWN.
// No domain decision authority is transferred.

import { useEffect } from "react";

import { useTonightContext } from "@/hooks/twinme/useTonightContext";
import {
  publishLifeContextSignal,
  removeLifeContextSignal,
  type LifeContextSignal,
} from "@/lib/twinme/life-context";

const TONIGHT_LIFE_CONTEXT_SIGNAL_ID =
  "tonight:current-context";

export default function LifeContextRuntime() {
  const { tonight } = useTonightContext();

  useEffect(() => {
    if (!tonight) {
      removeLifeContextSignal(
        TONIGHT_LIFE_CONTEXT_SIGNAL_ID,
      );
      return;
    }

    const destination =
      tonight.venue?.trim() ||
      tonight.destination?.trim() ||
      null;

    const parts = [
      tonight.vibeLabel?.trim() || null,
      tonight.occasion?.trim() || null,
      destination,
      tonight.desiredFeeling?.trim() || null,
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.length > 0,
    );

    if (parts.length === 0) {
      removeLifeContextSignal(
        TONIGHT_LIFE_CONTEXT_SIGNAL_ID,
      );
      return;
    }

    const signal: LifeContextSignal = {
      id: TONIGHT_LIFE_CONTEXT_SIGNAL_ID,
      domain: "TONIGHT",
      summary: parts.join(" · "),
      source: "TONIGHT_CONTEXT",
      strength: "STRONG",
      observedAt: tonight.updatedAt,
      expiresAt: tonight.expiresAt,
    };

    publishLifeContextSignal(signal);
  }, [tonight]);

  return null;
}
