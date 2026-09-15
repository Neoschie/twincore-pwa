import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("R20.7 PWA + cross-feature authority", () => {
  it("uses shared-profile authority on the home surface", () => {
    const home = source("app/page.tsx");

    expect(home).toContain('getSharedProfile');
    expect(home).toContain('"TwinCore Member"');
    expect(home).not.toContain('useState("Neo")');
    expect(home).not.toContain('? "Neo"');
  });

  it("does not seed personal/demo profile identity", () => {
    const profile = source("app/profile/page.tsx");

    expect(profile).toContain('displayName: ""');
    expect(profile).toContain('vibe: ""');
    expect(profile).toContain('city: ""');
    expect(profile).not.toContain('displayName: "Neo"');
    expect(profile).not.toContain('vibe: "Calm but lit"');
    expect(profile).not.toContain('city: "London, ON"');
  });

  it("routes TwinMe exit action into the canonical safety journey", () => {
    const chat = source("components/twinme/TwinMeChat.tsx");

    expect(chat).toContain('href="/safety"');
    expect(chat).not.toContain('href="/exit"');
  });

  it("declares standalone PWA authority with usable icons", () => {
    const manifest = JSON.parse(source("public/manifest.json"));

    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");

    expect(statSync("public/icon-192.png").size).toBeGreaterThan(0);
    expect(statSync("public/icon-512.png").size).toBeGreaterThan(0);
  });
});
