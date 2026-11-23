import { describe, expect, it } from "vitest";
import {
  wizardDescriptionsLine,
  wizardReferenceInstructions,
} from "./referenceImageRules";

describe("wizard reference rules", () => {
  it("portraits keep the exact design, props included", () => {
    const text = wizardReferenceInstructions("exact");
    expect(text).toContain("props and overall design exactly");
  });

  it("duel scenes let the action change pose, props and form", () => {
    const text = wizardReferenceInstructions("scene");
    expect(text).not.toContain("exactly");
    expect(text).toContain("Do NOT copy the pose");
    expect(text).toContain("draw ONLY the transformed form");
    expect(text).toContain("does not hold their staff");
  });

  it("frames descriptions as the usual look in scenes", () => {
    const wizards = [{ name: "Merlin", description: "Blue robe, oak staff" }];
    expect(wizardDescriptionsLine(wizards, "exact")).toBe(
      "The wizards are: Merlin: Blue robe, oak staff.",
    );
    expect(wizardDescriptionsLine(wizards, "scene")).toContain(
      "usual look, for recognition only",
    );
  });
});
