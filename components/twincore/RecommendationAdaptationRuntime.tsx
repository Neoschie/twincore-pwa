"use client";

import { useEffect } from "react";

import {
  readRecommendationLearning,
  subscribeToRecommendationLearning,
} from "@/lib/twinme/recommendation-learning-bridge";

import {
  createRecommendationAdaptation,
  publishRecommendationAdaptation,
} from "@/lib/twinme/recommendation-adaptation-bridge";

// TWINCORE_RECOMMENDATION_ADAPTATION_RUNTIME_R14_9D
//
// Single global adaptation runtime boundary:
//
// canonical recommendation learning
//          ↓
// bounded adaptation classification
//          ↓
// canonical adaptation publication
//
// This runtime does NOT:
// - rank recommendations
// - modify Move intelligence
// - modify Venue intelligence
// - modify Crew intelligence
// - override Safety
// - write TwinMe Memory
// - modify Predictive intelligence
// - modify Autonomy intelligence
//
// R14.8 remains learning authority.
// R14.9B remains adaptation-semantics authority.
// Safety retains absolute veto authority.

export default function RecommendationAdaptationRuntime() {
  useEffect(() => {
    // TWINCORE_RECOMMENDATION_ADAPTATION_LEARNING_SYNC_R14_9D
    const syncLearningToAdaptation = () => {
      const learning = readRecommendationLearning();

      if (!learning) {
        return;
      }

      const adaptation = createRecommendationAdaptation(learning);

      publishRecommendationAdaptation(adaptation);
    };

    // Hydrate from the latest canonical learning already present.
    syncLearningToAdaptation();

    // Observe subsequent same-tab and cross-tab learning publications.
    return subscribeToRecommendationLearning(syncLearningToAdaptation);
  }, []);

  return null;
}
