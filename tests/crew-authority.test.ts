import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("R20.2 Crew production authority", () => {
  it("does not hard-code Neo into reachable Crew identity surfaces", () => {
    const source = [
      read("app/crew/page.tsx"),
      read("app/crew/CrewIdentityCard.tsx"),
      read("app/join/page.tsx"),
      read("app/invite/[code]/page.tsx"),
    ].join("\n");

    expect(source).not.toContain('"Neo"');
  });

  it("does not create production invites through local invite storage", () => {
    const joinSource = read("app/join/page.tsx");

    expect(joinSource).not.toContain("createLocalInvite(");
    expect(joinSource).toContain('.from("crew_invites")');
  });

  it("does not accept production Crew membership through local storage", () => {
    const inviteSource = read("app/invite/[code]/page.tsx");

    expect(inviteSource).not.toContain("acceptLocalInvite(code");
    expect(inviteSource).not.toContain("getInviteByCode(code");
    expect(inviteSource).toContain(
      'rpc("accept_twincore_crew_invite"',
    );
  });

  it("uses shared profile identity in Crew", () => {
    const crewSource = read("app/crew/page.tsx");

    expect(crewSource).toContain("getSharedProfile");
    expect(crewSource).toContain("resolveCrewDisplayName");
  });
});
