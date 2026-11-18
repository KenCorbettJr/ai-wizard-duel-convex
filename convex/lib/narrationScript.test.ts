import { describe, it, expect } from "vitest";
import { buildNarrationScript } from "./narrationScript";

describe("buildNarrationScript", () => {
  it("joins paragraphs and result with short pauses", () => {
    expect(buildNarrationScript("One.\n\nTwo.", "Done!")).toBe(
      "One. <short pause> Two. <short pause> Done!",
    );
  });

  it("strips markdown and angle brackets", () => {
    expect(buildNarrationScript("**Boom** <laugh> _crash_")).toBe(
      "Boom laugh crash",
    );
  });

  it("caps very long narration at a paragraph boundary", () => {
    const paragraph = "x".repeat(2500);
    const script = buildNarrationScript(
      `${paragraph}\n${paragraph}\n${paragraph}`,
    );
    expect(script.split(" <short pause> ")).toHaveLength(2);
  });
});
