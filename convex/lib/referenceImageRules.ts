import { v, Infer } from "convex/values";

/**
 * How strictly an image follows its wizard reference images.
 * - "exact": the same character, same design (a wizard portrait drawn from
 *   the plain-background version).
 * - "scene": the references only make the wizards recognizable. The scene
 *   decides pose, what they hold and what form they are in (duel rounds,
 *   where a wizard may roll into a ball or turn into a dinosaur).
 */
export const referenceStyleValidator = v.union(
  v.literal("exact"),
  v.literal("scene"),
);
export type ReferenceStyle = Infer<typeof referenceStyleValidator>;

const NO_SHEET =
  "The reference images only show what the character looks like: do NOT reproduce their layout, white or gray background, or framing. Do NOT make a character sheet, turnaround, multiple views, panels, collage, labels, or any text. The scene background must fill the entire image edge to edge.";

/** Instructions for drawing the wizards from their reference images. */
export function wizardReferenceInstructions(style: ReferenceStyle): string {
  if (style === "exact") {
    return `Create ONE single full-frame illustration of ONE scene, as described above, with the wizard(s) drawn from the appearance reference image(s). Keep each wizard's face, fur or skin, hair, clothing, colors, props and overall design exactly as in their reference. Change only the pose, lighting and surroundings. ${NO_SHEET}`;
  }
  return [
    "Create ONE single full-frame illustration of ONE scene, as described above.",
    "The reference images show WHO each wizard is, not how they must look in this scene. Keep each wizard recognizable through their identifying features: face, fur or skin, color scheme and signature markings.",
    "The scene description decides everything else: pose, body shape, motion, what they hold and what form they are in. Do NOT copy the pose from the reference image.",
    "If the scene says a wizard has transformed or changed shape (into a creature, a machine, an object, a ball, energy, and so on), draw ONLY the transformed form, carrying the wizard's colors and markings so they stay recognizable. Do NOT also draw the wizard in their usual form beside it, inside it or riding it.",
    "A wizard who is spinning, curled up, transformed, or using both hands does not hold their staff or other props unless the scene says so.",
    NO_SHEET,
  ].join(" ");
}

/** Lists the wizards' standard descriptions for context. */
export function wizardDescriptionsLine(
  descriptions: Array<{ name: string; description: string }>,
  style: ReferenceStyle,
): string {
  const list = descriptions
    .map((w) => `${w.name}: ${w.description}`)
    .join(". ");
  return style === "exact"
    ? `The wizards are: ${list}.`
    : `Each wizard's usual look, for recognition only (this scene's action can change their pose, form and what they hold): ${list}.`;
}

/** Short version for FAL, which gets plain reference URLs. */
export function falReferenceSuffix(style: ReferenceStyle): string {
  return style === "exact"
    ? "Keep each wizard's appearance exactly as in the reference images."
    : "Keep each wizard recognizable from the reference images, but follow the scene for their pose, form and what they hold.";
}
