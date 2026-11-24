import { Composition, staticFile } from "remotion";
import { DuelTeaser } from "./DuelTeaser";
import { FPS, HEIGHT, WIDTH, totalFrames, type TeaserProps } from "./types";

// Placeholder content for previewing in Remotion Studio (npm run studio).
const sample: TeaserProps = {
  teaserId: "sample",
  siteLabel: "aiwizardduel.com",
  wizards: [
    {
      name: "Zephyra Stormweaver",
      portraitUrl: staticFile("sample/wizard.jpg"),
    },
    {
      name: "Grimbold the Unwashed",
      portraitUrl: staticFile("sample/wizard.jpg"),
    },
  ],
  segments: [
    {
      kind: "hook",
      line: "Zephyra Stormweaver versus Grimbold the Unwashed. Only one leaves the arena.",
      imageUrl: null,
      clipUrl: null,
      audioUrl: null,
      audioMs: 3500,
    },
    {
      kind: "scene",
      line: "Lightning splits the sky as Zephyra calls down the storm.",
      imageUrl: staticFile("sample/scene.jpeg"),
      clipUrl: null,
      audioUrl: null,
      audioMs: 3800,
    },
    {
      kind: "scene",
      line: "But Grimbold answers with a cloud of truly unholy stench.",
      imageUrl: staticFile("sample/scene.jpeg"),
      clipUrl: null,
      audioUrl: null,
      audioMs: 3600,
    },
    {
      kind: "outro",
      line: "Who will be left standing? Go to AI Wizard Duel to see how it ended!",
      imageUrl: null,
      clipUrl: null,
      audioUrl: null,
      audioMs: 4200,
    },
  ],
};

export const Root = () => (
  <Composition
    id="DuelTeaser"
    component={DuelTeaser}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={totalFrames(sample)}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props),
    })}
  />
);
