export type AuthMode = "signin" | "signup";

export function sanitizeNextPath(
  requested: string | null | undefined,
): string | null {
  if (
    !requested ||
    !requested.startsWith("/") ||
    requested.startsWith("//")
  ) {
    return null;
  }

  return requested;
}

export function resolvePostAuthPath(input: {
  mode: AuthMode;
  requestedPath?: string | null;
  onboardingComplete: boolean;
}): string {
  const requested = sanitizeNextPath(input.requestedPath);

  if (requested) {
    return requested;
  }

  if (input.mode === "signup") {
    return "/onboarding";
  }

  return input.onboardingComplete ? "/" : "/onboarding";
}
