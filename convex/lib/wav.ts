/**
 * Minimal WAV helpers for teaser voice lines. Gemini TTS returns WAV; if it
 * ever returns bare PCM instead, we wrap it (24 kHz, 16-bit, mono is Gemini's
 * PCM format) so browsers and the renderer can play it.
 */

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS = 16;

function ascii(bytes: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + length));
}

/** Duration in milliseconds, or null if this isn't a WAV file we understand. */
export function wavDurationMs(bytes: Uint8Array): number | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let byteRate: number | null = null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    let size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt " && body + 12 <= bytes.length) {
      byteRate = view.getUint32(body + 8, true);
    } else if (id === "data" && byteRate) {
      // Streamed WAVs can leave the size as a placeholder.
      if (size === 0 || size === 0xffffffff || body + size > bytes.length) {
        size = bytes.length - body;
      }
      return Math.round((size / byteRate) * 1000);
    }
    offset = body + size + (size % 2);
  }
  return null;
}

/** Wraps 24 kHz 16-bit mono PCM in a WAV header. */
export function pcmToWav(pcm: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(44 + pcm.length));
  const view = new DataView(out.buffer);
  const write = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) out[at + i] = text.charCodeAt(i);
  };
  const blockAlign = (PCM_CHANNELS * PCM_BITS) / 8;
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, PCM_CHANNELS, true);
  view.setUint32(24, PCM_SAMPLE_RATE, true);
  view.setUint32(28, PCM_SAMPLE_RATE * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, PCM_BITS, true);
  write(36, "data");
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

/** A playable WAV and its length, whatever shape the TTS audio came in. */
export function normalizeSpeech(audio: Uint8Array): {
  wav: Uint8Array<ArrayBuffer>;
  durationMs: number;
} {
  const ms = wavDurationMs(audio);
  if (ms !== null) {
    const wav = new Uint8Array(new ArrayBuffer(audio.length));
    wav.set(audio);
    return { wav, durationMs: ms };
  }
  const wav = pcmToWav(audio);
  return { wav, durationMs: wavDurationMs(wav) ?? 0 };
}
