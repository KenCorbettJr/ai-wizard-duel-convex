import { describe, expect, it } from "vitest";
import { normalizeSpeech, pcmToWav, wavDurationMs } from "./wav";

describe("wav helpers", () => {
  it("wraps PCM and measures it", () => {
    // One second of 24 kHz 16-bit mono is 48,000 bytes.
    const wav = pcmToWav(new Uint8Array(48000));
    expect(wavDurationMs(wav)).toBe(1000);
  });

  it("rejects things that aren't WAV", () => {
    expect(
      wavDurationMs(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    ).toBeNull();
  });

  it("treats bare audio as PCM", () => {
    const { wav, durationMs } = normalizeSpeech(new Uint8Array(24000));
    expect(durationMs).toBe(500);
    expect(String.fromCharCode(...wav.subarray(0, 4))).toBe("RIFF");
  });

  it("keeps a real WAV as is", () => {
    const original = pcmToWav(new Uint8Array(96000));
    const { wav, durationMs } = normalizeSpeech(original);
    expect(durationMs).toBe(2000);
    expect(wav.length).toBe(original.length);
  });

  it("copes with a placeholder data size", () => {
    const wav = pcmToWav(new Uint8Array(48000));
    new DataView(wav.buffer).setUint32(40, 0xffffffff, true);
    expect(wavDurationMs(wav)).toBe(1000);
  });
});
