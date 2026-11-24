/** Mirrors the shape returned by convex/teasers.ts getRenderProps. */
export type TeaserSegment = {
  kind: "hook" | "scene" | "outro";
  line: string;
  imageUrl: string | null;
  clipUrl: string | null;
  audioUrl: string | null;
  audioMs: number;
};

export type TeaserProps = {
  teaserId: string;
  wizards: Array<{ name: string; portraitUrl: string | null }>;
  segments: TeaserSegment[];
  /** AI music made for this teaser. Null uses the bundled track. */
  musicUrl?: string | null;
  siteLabel: string;
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * The narrator plays this much faster than recorded. Remotion keeps the
 * pitch, so it sounds like a quicker read, not a chipmunk.
 */
export const VOICE_RATE = 1.12;
/** Breathing room after each voice line. */
const PAD_FRAMES = 6;
/** The call to action stays on screen this long after the voice ends. */
const OUTRO_HOLD_FRAMES = 2 * FPS;

/** How long the voice line lasts on screen, after speeding it up. */
export function voiceMs(segment: TeaserSegment): number {
  return segment.audioMs / VOICE_RATE;
}

export function voiceFrames(segment: TeaserSegment): number {
  return Math.ceil((voiceMs(segment) / 1000) * FPS);
}

export function segmentFrames(segment: TeaserSegment): number {
  const voice = voiceFrames(segment);
  return (
    voice + PAD_FRAMES + (segment.kind === "outro" ? OUTRO_HOLD_FRAMES : 0)
  );
}

export function totalFrames(props: TeaserProps): number {
  return Math.max(
    FPS,
    props.segments.reduce((sum, s) => sum + segmentFrames(s), 0),
  );
}
