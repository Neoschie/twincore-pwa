import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/twinme/page.tsx", "utf8");

describe("R21-B01 TwinMe daily focus routing", () => {
  it("recognizes daily focus prompts before generic life-decision fallback", () => {
    expect(source).toContain('const isDailyFocusPrompt =');
    expect(source).toContain('what should i focus');
    expect(source).toContain('what should i prioritize');
    expect(source).toContain('!isDailyFocusPrompt');
  });

  it("provides a relevant daily-focus response", () => {
    expect(source).toContain(
      "Focus on the one thing that would make today feel meaningfully handled.",
    );
  });

  it("preserves the real life-decision fallback", () => {
    expect(source).toContain(
      "I'd be happy to think it through with you. Tell me a little more about the decision you're facing.",
    );
  });

  it("checks focus routing before the first generic decision response", () => {
    const focus = source.indexOf("if (isDailyFocusPrompt)");
    const fallback = source.indexOf(
      "I'd be happy to think it through with you. Tell me a little more about the decision you're facing.",
    );

    expect(focus).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(-1);
    expect(focus).toBeLessThan(fallback);
  });
});
