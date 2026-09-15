import { describe, expect, it } from "vitest";
import {
  resolvePostAuthPath,
  sanitizeNextPath,
} from "@/lib/auth-flow";
import { hasCompletedOnboarding } from "@/lib/onboarding-state";

describe("R20.1 auth flow authority", () => {
  it("rejects unsafe external-style next paths", () => {
    expect(sanitizeNextPath("//evil.example")).toBeNull();
    expect(sanitizeNextPath("https://evil.example")).toBeNull();
  });

  it("preserves a valid internal return path", () => {
    expect(
      resolvePostAuthPath({
        mode: "signin",
        requestedPath: "/invite/ABC123",
        onboardingComplete: false,
      }),
    ).toBe("/invite/ABC123");
  });

  it("routes a new signup into onboarding by default", () => {
    expect(
      resolvePostAuthPath({
        mode: "signup",
        onboardingComplete: false,
      }),
    ).toBe("/onboarding");
  });

  it("routes an incomplete returning user into onboarding", () => {
    expect(
      resolvePostAuthPath({
        mode: "signin",
        onboardingComplete: false,
      }),
    ).toBe("/onboarding");
  });

  it("routes a completed returning user home", () => {
    expect(
      resolvePostAuthPath({
        mode: "signin",
        onboardingComplete: true,
      }),
    ).toBe("/");
  });

  it("reads account-backed onboarding metadata", () => {
    expect(
      hasCompletedOnboarding({
        user_metadata: {
          twincore_onboarding_complete: true,
        },
      } as never),
    ).toBe(true);

    expect(
      hasCompletedOnboarding({
        user_metadata: {},
      } as never),
    ).toBe(false);
  });
});
