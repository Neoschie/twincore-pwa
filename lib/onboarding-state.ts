import type { User } from "@supabase/supabase-js";

export const ONBOARDING_METADATA_KEY = "twincore_onboarding_complete";
export const ONBOARDING_LOCAL_KEY = "twincore_onboarding_complete";

export function hasCompletedOnboarding(
  user: Pick<User, "user_metadata"> | null | undefined,
): boolean {
  return user?.user_metadata?.[ONBOARDING_METADATA_KEY] === true;
}
