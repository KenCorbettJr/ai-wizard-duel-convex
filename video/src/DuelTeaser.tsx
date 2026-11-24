import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import {
  FPS,
  VOICE_RATE,
  segmentFrames,
  voiceFrames,
  voiceMs,
  type TeaserProps,
  type TeaserSegment,
} from "./types";

const { fontFamily: display } = loadCinzel("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});
const { fontFamily: sans } = loadGeist("normal", {
  weights: ["800"],
  subsets: ["latin"],
});

const GOLD = "#f2c14e";
const DEEP = "#0d0716";
const CTA_START = "Go to AI Wizard Duel";

/** Seconds of voice per frame of the segment, so captions follow the narrator. */
function voiceProgress(frame: number, audioMs: number): number {
  return Math.min(1, frame / Math.max(1, (audioMs / 1000) * FPS));
}

function Embers({ seed }: { seed: string }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 36 }, (_, i) => {
        const x = random(`${seed}x${i}`) * width;
        const speed = 1 + random(`${seed}s${i}`) * 3;
        const y =
          height -
          ((frame * speed + random(`${seed}y${i}`) * height) % (height + 40));
        const size = 4 + random(`${seed}r${i}`) * 8;
        const flicker = 0.4 + 0.6 * Math.abs(Math.sin((frame + i * 7) / 9));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin((frame + i * 13) / 20) * 20,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: GOLD,
              opacity: 0.55 * flicker,
              boxShadow: `0 0 ${size * 3}px ${GOLD}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function Backdrop({ seed }: { seed: string }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 35%, #3b1d5e 0%, #1b0e2e 45%, ${DEEP} 100%)`,
      }}
    >
      <Embers seed={seed} />
    </AbsoluteFill>
  );
}

/** Big, word-by-word captions in the lower third, Shorts style. */
function Captions({
  text,
  audioMs,
  bottom = 360,
}: {
  text: string;
  audioMs: number;
  bottom?: number;
}) {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const totalChars = words.reduce((n, w) => n + w.length + 1, 0);
  const progress = voiceProgress(frame, audioMs) * totalChars;

  // Which word the narrator is on, by character position.
  let spoken = 0;
  let current = 0;
  for (let i = 0; i < words.length; i++) {
    spoken += words[i].length + 1;
    if (spoken > progress) {
      current = i;
      break;
    }
    current = i;
  }
  const CHUNK = 4;
  const start = Math.floor(current / CHUNK) * CHUNK;
  const chunk = words.slice(start, start + CHUNK);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: bottom,
      }}
    >
      <div
        style={{
          maxWidth: 940,
          textAlign: "center",
          fontFamily: sans,
          fontWeight: 800,
          fontSize: 78,
          lineHeight: 1.15,
          color: "white",
          textTransform: "uppercase",
          WebkitTextStroke: "3px rgba(0,0,0,0.85)",
          paintOrder: "stroke fill",
          textShadow: "0 6px 24px rgba(0,0,0,0.9)",
        }}
      >
        {chunk.map((word, i) => (
          <span
            key={`${start + i}`}
            style={{
              color: start + i === current ? GOLD : "white",
              display: "inline-block",
              margin: "0 18px",
              transform: start + i === current ? "scale(1.06)" : "none",
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function FadeIn({
  children,
  frames,
}: {
  children: React.ReactNode;
  frames: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 4, frames - 4, frames],
    [0, 1, 1, 0.85],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function Portrait({
  url,
  name,
  from,
  delay,
}: {
  url: string | null;
  name: string;
  from: -1 | 1;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        transform: `translateX(${(1 - enter) * from * 900}px) scale(${1 + frame / 600})`,
      }}
    >
      <div
        style={{
          width: 400,
          height: 400,
          borderRadius: 48,
          overflow: "hidden",
          border: `8px solid ${GOLD}`,
          boxShadow: `0 0 80px rgba(242,193,78,0.45)`,
          background: "#24143a",
        }}
      >
        {url && (
          <Img
            src={url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 900,
          fontSize: 60,
          color: "white",
          textAlign: "center",
          maxWidth: 960,
          textShadow: "0 4px 18px rgba(0,0,0,0.9)",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function Hook({
  props,
  segment,
}: {
  props: TeaserProps;
  segment: TeaserSegment;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b] = props.wizards;
  const vs = spring({
    frame: frame - 12,
    fps,
    config: { damping: 8, mass: 0.6 },
  });
  return (
    <AbsoluteFill>
      <Backdrop seed="hook" />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 90,
          gap: 20,
        }}
      >
        {a && (
          <Portrait url={a.portraitUrl} name={a.name} from={-1} delay={0} />
        )}
        <div
          style={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 130,
            color: GOLD,
            transform: `scale(${vs})`,
            textShadow: `0 0 50px ${GOLD}`,
            lineHeight: 1,
          }}
        >
          VS
        </div>
        {b && <Portrait url={b.portraitUrl} name={b.name} from={1} delay={6} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Scene({
  segment,
  index,
  frames,
}: {
  segment: TeaserSegment;
  index: number;
  frames: number;
}) {
  const frame = useCurrentFrame();
  const progress = frame / frames;
  // Pictures are 3:2, so at full height they're much wider than the frame.
  // Pan across them like a camera, alternating direction. The offset is a
  // share of the picture's own width, which stays inside its edges.
  const direction = index % 2 === 0 ? 1 : -1;
  const pan = interpolate(progress, [0, 1], [-12 * direction, 12 * direction]);
  const scale = interpolate(progress, [0, 1], [1.04, 1.14]);
  return (
    <AbsoluteFill style={{ background: DEEP, overflow: "hidden" }}>
      {segment.imageUrl && (
        <AbsoluteFill style={{ transform: `scale(${scale})` }}>
          <Img
            src={segment.imageUrl}
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              height: "100%",
              width: "auto",
              maxWidth: "none",
              transform: `translateX(calc(-50% + ${pan}%))`,
            }}
          />
        </AbsoluteFill>
      )}
      {segment.clipUrl && (
        <AbsoluteFill>
          <OffthreadVideo
            src={segment.clipUrl}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(13,7,22,0.55) 0%, rgba(13,7,22,0) 22%, rgba(13,7,22,0) 55%, rgba(13,7,22,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

function Outro({
  props,
  segment,
}: {
  props: TeaserProps;
  segment: TeaserSegment;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaAt = segment.line.indexOf(CTA_START);
  const ctaShare = ctaAt > 0 ? ctaAt / segment.line.length : 0.5;
  const ctaFrame = Math.round(ctaShare * (voiceMs(segment) / 1000) * fps);
  const question = spring({ frame, fps, config: { damping: 12 } });
  const cta = spring({ frame: frame - ctaFrame, fps, config: { damping: 12 } });
  const pulse = 1 + 0.03 * Math.sin(frame / 5);
  return (
    <AbsoluteFill>
      <Backdrop seed="outro" />
      <AbsoluteFill style={{ flexDirection: "row", opacity: 0.18 }}>
        {props.wizards.map((w) =>
          w.portraitUrl ? (
            <Img
              key={w.name}
              src={w.portraitUrl}
              style={{
                width: "50%",
                height: "100%",
                objectFit: "cover",
                filter: "grayscale(0.6) blur(6px)",
              }}
            />
          ) : null,
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 70,
          padding: 70,
          paddingBottom: 200,
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 170,
            color: GOLD,
            textAlign: "center",
            lineHeight: 1,
            transform: `scale(${question})`,
            textShadow: `0 0 60px ${GOLD}`,
          }}
        >
          WHO WON?
        </div>
        <div
          style={{
            opacity: cta,
            transform: `translateY(${(1 - cta) * 80}px) scale(${cta > 0.95 ? pulse : 1})`,
            background: "rgba(13,7,22,0.85)",
            border: `6px solid ${GOLD}`,
            borderRadius: 40,
            padding: "48px 56px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            boxShadow: `0 0 70px rgba(242,193,78,0.4)`,
          }}
        >
          <Img
            src={staticFile("logo.png")}
            style={{ width: 150, height: 150, borderRadius: 32 }}
          />
          <div
            style={{
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 64,
              color: "white",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            Go to <span style={{ color: GOLD }}>AI Wizard Duel</span> to see how
            it ended!
          </div>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 56,
              color: GOLD,
            }}
          >
            {props.siteLabel}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const DuelTeaser = (props: TeaserProps) => {
  let from = 0;
  let sceneIndex = 0;
  return (
    <AbsoluteFill style={{ background: DEEP }}>
      {props.segments.map((segment, i) => {
        const frames = segmentFrames(segment);
        const start = from;
        from += frames;
        const index = segment.kind === "scene" ? sceneIndex++ : 0;
        const ctaAt = segment.line.indexOf(CTA_START);
        const caption =
          segment.kind === "outro" && ctaAt > 0
            ? segment.line.slice(0, ctaAt).trim()
            : segment.line;
        const captionMs =
          segment.kind === "outro" && ctaAt > 0
            ? voiceMs(segment) * (ctaAt / segment.line.length)
            : voiceMs(segment);
        return [
          <Sequence
            key={i}
            from={start}
            durationInFrames={frames}
            name={`${segment.kind} ${i}`}
          >
            <FadeIn frames={frames}>
              {segment.kind === "hook" && (
                <Hook props={props} segment={segment} />
              )}
              {segment.kind === "scene" && (
                <Scene segment={segment} index={index} frames={frames} />
              )}
              {segment.kind === "outro" && (
                <Outro props={props} segment={segment} />
              )}
              {segment.kind !== "hook" && (
                <Sequence
                  durationInFrames={Math.ceil((captionMs / 1000) * FPS) + 6}
                  layout="none"
                >
                  <Captions
                    text={caption}
                    audioMs={captionMs}
                    bottom={segment.kind === "outro" ? 1500 : 360}
                  />
                </Sequence>
              )}
              {segment.kind === "hook" && (
                <Captions
                  text={segment.line}
                  audioMs={voiceMs(segment)}
                  bottom={110}
                />
              )}
            </FadeIn>
            {segment.audioUrl && (
              <Audio src={segment.audioUrl} playbackRate={VOICE_RATE} />
            )}
            <SoundEffects segment={segment} />
          </Sequence>,
          segment.kind === "scene" && <Whoosh key={`w${i}`} at={start} />,
        ];
      })}
      <Music props={props} />
    </AbsoluteFill>
  );
};

/** Whoosh into each scene, boom on the VS and on WHO WON?, sparkle on the CTA. */
/** Starts before the cut into a scene so the rush of air peaks on the cut. */
function Whoosh({ at }: { at: number }) {
  return (
    <Sequence from={Math.max(0, at - 14)} durationInFrames={24} layout="none">
      <Audio src={staticFile("sfx/whoosh.wav")} volume={0.4} />
    </Sequence>
  );
}

function SoundEffects({ segment }: { segment: TeaserSegment }) {
  if (segment.kind === "hook") {
    return (
      <Sequence from={10} layout="none">
        <Audio src={staticFile("sfx/boom.wav")} volume={0.55} />
      </Sequence>
    );
  }
  if (segment.kind === "scene") return null; // See Whoosh.
  const ctaAt = segment.line.indexOf(CTA_START);
  const ctaShare = ctaAt > 0 ? ctaAt / segment.line.length : 0.5;
  return (
    <>
      <Audio src={staticFile("sfx/boom.wav")} volume={0.7} />
      <Sequence
        from={Math.round(ctaShare * (voiceMs(segment) / 1000) * FPS)}
        layout="none"
      >
        <Audio src={staticFile("sfx/shimmer.wav")} volume={0.3} />
      </Sequence>
    </>
  );
}

const MUSIC_UNDER_VOICE = 0.17;
const MUSIC_IN_GAPS = 0.6;
const DUCK_FRAMES = 6;

/**
 * Background music under the whole teaser. It drops while the narrator
 * speaks, swells in the gaps, and fades out at the very end.
 */
function Music({ props }: { props: TeaserProps }) {
  const { durationInFrames } = useVideoConfig();
  const voice: Array<[number, number]> = [];
  let from = 0;
  for (const segment of props.segments) {
    voice.push([from, from + voiceFrames(segment)]);
    from += segmentFrames(segment);
  }
  const volume = (frame: number) => {
    // How close the frame is to speech: 1 inside, easing to 0 nearby.
    let near = 0;
    for (const [start, end] of voice) {
      const distance =
        frame < start ? start - frame : frame > end ? frame - end : 0;
      near = Math.max(near, 1 - Math.min(1, distance / DUCK_FRAMES));
    }
    const level = MUSIC_IN_GAPS + (MUSIC_UNDER_VOICE - MUSIC_IN_GAPS) * near;
    const fade = interpolate(
      frame,
      [0, 3, durationInFrames - 24, durationInFrames - 1],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return level * fade;
  };
  return (
    <Audio
      src={props.musicUrl ?? staticFile("music/fallback.mp3")}
      volume={volume}
    />
  );
}
