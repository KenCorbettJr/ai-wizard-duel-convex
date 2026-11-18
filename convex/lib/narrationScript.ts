const MAX_SCRIPT_CHARS = 6000;

// Style applies to the whole read. The accent comes from the chosen voice.
export const NARRATION_STYLE =
  "A booming, theatrical announcer narrating a grand magical duel. Recorded dry and close to the microphone in a dead studio booth: no echo, no reverb, no cathedral or stadium ambience. Rich vocal inflection and dramatic pacing, hushed tension before big moments, rising excitement as spells collide, and a triumphant flourish on victories.";

function cleanText(text: string): string {
  return text
    .replace(/[*_`#>~]/g, "") // markdown
    .replace(/[<>]/g, "") // would be read as vocal tags
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Builds the verbatim transcript for TTS. The one-line result teaser is shown
 * on screen and is not read aloud. Paragraph breaks become short
 * pauses so the delivery breathes like a real announcer.
 */
export function buildNarrationScript(narrative: string): string {
  const paragraphs = cleanText(narrative)
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const kept: string[] = [];
  let length = 0;
  for (const paragraph of paragraphs) {
    if (length + paragraph.length > MAX_SCRIPT_CHARS && kept.length > 0) break;
    kept.push(paragraph);
    length += paragraph.length;
  }
  return kept.join(" <short pause> ");
}
