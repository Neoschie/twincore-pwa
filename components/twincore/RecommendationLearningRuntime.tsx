"use client";

import { useEffect } from "react";

import {
  readRecommendationOutcome,
  subscribeToRecommendationOutcome,
} from "@/lib/twinme/recommendation-outcome-bridge";

import {
  classifyRecommendationLearning,
  publishRecommendationLearning,
} from "@/lib/twinme/recommendation-learning-bridge";

// TWINCORE_RECOMMENDATION_LEARNING_RUNTIME_R14_8D
//
// Single global runtime boundary:
//
// verified recommendation outcome
//          ↓
// canonical learning classification
//          ↓
// canonical learning publication
//
// This runtime does NOT:
// - infer recommendation success
// - fabricate ACTED_ON or COMPLETED
// - rank recommendations
// - write TwinMe Memory
// - modify Predictive intelligence
// - modify Autonomy intelligence
// - modify Crew learning
//
// R14.7 remains outcome authority.
// R14.8B remains learning-semantics authority.

export default function RecommendationLearningRuntime() {
  useEffect(() => {
    // TWINCORE_RECOMMENDATION_LEARNING_OUTCOME_SYNC_R14_8D
    const syncOutcomeToLearning = () => {
      const outcome = readRecommendationOutcome();

      if (!outcome) {
        return;
      }

      const learning = classifyRecommendationLearning(outcome);

      publishRecommendationLearning(learning);
    };

    // Hydrate from the latest verified outcome already present.
    syncOutcomeToLearning();

    // Observe subsequent same-tab and cross-tab outcome publications.
    return subscribeToRecommendationOutcome(syncOutcomeToLearning);
  }, []);

  return null;
}
