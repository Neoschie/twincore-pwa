import { supabase } from "@/lib/supabase/client";
import {
  ONBOARDING_LOCAL_KEY,
  ONBOARDING_METADATA_KEY,
} from "@/lib/onboarding-state";

export async function markOnboardingComplete(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ONBOARDING_LOCAL_KEY, "true");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      [ONBOARDING_METADATA_KEY]: true,
    },
  });

  if (error) {
    throw new Error(
      error.message || "Unable to persist onboarding completion.",
    );
  }
}
