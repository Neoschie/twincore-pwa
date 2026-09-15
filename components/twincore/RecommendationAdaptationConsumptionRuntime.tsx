"use client";

import { useEffect } from "react";

import {
  readRecommendationAdaptation,
  subscribeToRecommendationAdaptation,
} from "@/lib/twinme/recommendation-adaptation-bridge";

import {
  createRecommendationAdaptationConsumptionHint,
  publishRecommendationAdaptationConsumption,
} from "@/lib/twinme/recommendation-adaptation-consumption-bridge";

// TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_RUNTIME_R14_10D
//
// Single global bounded-consumption runtime:
//
// canonical adaptation
//      ↓
// bounded consumption classification
//      ↓
// canonical consumption publication
//
// This runtime does NOT:
// - create venue scores
// - rank venues
// - make Move decisions
// - score Crew
// - override Safety
// - publish recommendations
// - modify Memory
// - modify Predictive intelligence
// - modify Autonomy intelligence
//
// R14.9 remains adaptation authority.
// R14.10B remains consumption-semantics authority.

export default function RecommendationAdaptationConsumptionRuntime() {
  useEffect(() => {
    // TWINCORE_RECOMMENDATION_ADAPTATION_CONSUMPTION_SYNC_R14_10D
    const syncAdaptationToConsumption = () => {
      const adaptation = readRecommendationAdaptation();

      if (!adaptation) {
        return;
      }

      const hint = createRecommendationAdaptationConsumptionHint(adaptation);

      publishRecommendationAdaptationConsumption(hint);
    };

    // Hydrate from the latest canonical adaptation already present.
    syncAdaptationToConsumption();

    // Observe subsequent same-tab and cross-tab adaptation publications.
    return subscribeToRecommendationAdaptation(syncAdaptationToConsumption);
  }, []);

  return null;
}
