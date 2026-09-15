import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { canAccessFeature } from "../lib/subscription/access";
import type { TwinCoreSubscriptionState } from "../lib/subscription/types";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const freeState: TwinCoreSubscriptionState = {
  plan: "free",
  status: "inactive",
  startedAt: null,
  expiresAt: null,
  partyPassActivatedAt: null,
  partyPassExpiresAt: null,
  source: "local",
};

describe("R20.3 Party production authority", () => {
  it("keeps base Party Mode available to the free plan", () => {
    expect(canAccessFeature(freeState, "party_mode").allowed).toBe(true);
  });

  it("uses shared profile and canonical active Crew authority", () => {
    const source = read("app/party/page.tsx");

    expect(source).toContain("getSharedProfile");
    expect(source).toContain("getActiveCrew");
    expect(source).not.toContain('useState("Neo")');
  });

  it("writes Party status against authenticated Crew authority", () => {
    const source = read("app/party/page.tsx");

    expect(source).toContain('.eq("user_id", user.id)');
    expect(source).toContain('.eq("crew_id", activeCrew.id)');
    expect(source).toContain("crew_id: activeCrew.id");
  });

  it("does not expose the legacy local Party Dashboard authority", () => {
    const mainParty = read("app/party/page.tsx");
    const dashboard = read("app/party/dashboard/page.tsx");

    expect(mainParty).not.toContain('href="/party/dashboard"');
    expect(dashboard).toContain('redirect("/party")');
    expect(dashboard).not.toContain("updateCrewStatus");
    expect(dashboard).not.toContain("getPartyTimeline");
  });
});
