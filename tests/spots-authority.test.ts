import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("R20.4 Spots production authority", () => {
  it("uses live nearby provider results without static venue fallback", () => {
    const source = read("app/spots/page.tsx");

    expect(source).toContain("return realNearbySpots;");
    expect(source).not.toContain(
      "realNearbySpots.length > 0 ? realNearbySpots : nearbySpots",
    );
    expect(source).not.toContain("...liveActivities");
    expect(source).not.toContain("Harbour Social");
  });

  it("uses shared identity and active Crew radar authority", () => {
    const source = read("app/spots/page.tsx");

    expect(source).toContain("getSharedProfile");
    expect(source).toContain("getActiveCrew");
    expect(source).toContain('.eq("crew_id", activeCrew.id)');
    expect(source).not.toContain('useState("Neo")');
  });

  it("loads venue detail from Google Places rather than URL metadata", () => {
    const source = read("app/spots/[placeId]/page.tsx");

    expect(source).toContain(
      "https://places.googleapis.com/v1/places/",
    );
    expect(source).toContain("currentOpeningHours");
    expect(source).toContain("nextCloseTime");
    expect(source).not.toContain("nearbySpotsData");
    expect(source).not.toContain("searchParams");
  });

  it("provides the Google Places photo proxy used by nearby results", () => {
    expect(
      existsSync(
        new URL(
          "../app/api/spots/photo/route.ts",
          import.meta.url,
        ),
      ),
    ).toBe(true);

    const source = read("app/api/spots/photo/route.ts");

    expect(source).toContain("X-Goog-Api-Key");
    expect(source).toContain("/media?maxWidthPx=");
    expect(source).not.toContain("NEXT_PUBLIC_PLACES_API_KEY");
  });

  it("does not publicly display inferred exact occupancy percentages", () => {
    const main = read("app/spots/page.tsx");
    const detail = read(
      "app/spots/[placeId]/VenueRealtimeIntelligence.tsx",
    );

    expect(main).not.toContain("{spot.occupancyPercent}%");
    expect(detail).not.toContain(
      "{crowdIntelligence.occupancyPercent}%",
    );
    expect(detail).not.toContain(
      "🔥 {heatScore} Heat Score",
    );
  });

  it("preserves qualitative crowd intelligence", () => {
    const detail = read(
      "app/spots/[placeId]/VenueRealtimeIntelligence.tsx",
    );

    expect(detail).toContain('"Quiet"');
    expect(detail).toContain('"Moderate"');
    expect(detail).toContain('"Busy"');
    expect(detail).toContain('"Packed"');
  });
});
