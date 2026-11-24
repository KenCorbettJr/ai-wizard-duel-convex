"""Synthesizes the teaser sound effects into public/sfx. No dependencies.

Run from video/: python3 scripts/make-sfx.py
"""

import math
import os
import random
import struct
import wave

RATE = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")


def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.89 / peak
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(
            b"".join(struct.pack("<h", int(s * gain * 32767)) for s in samples)
        )


def whoosh(seconds=0.75):
    """Filtered noise that sweeps up and fades, like air rushing past."""
    rng = random.Random(7)
    n = int(seconds * RATE)
    out, low, band = [], 0.0, 0.0
    for i in range(n):
        t = i / n
        # Cutoff sweeps 300 Hz -> 3 kHz -> 800 Hz.
        cutoff = 300 + 2700 * math.sin(math.pi * min(1, t * 1.3)) ** 2
        a = 1 - math.exp(-2 * math.pi * cutoff / RATE)
        x = rng.uniform(-1, 1)
        low += a * (x - low)
        band += a * (low - band)
        env = (t / 0.55) ** 2 if t < 0.55 else ((1 - t) / 0.45) ** 1.5
        out.append((low - band * 0.6) * env)
    return out


def boom(seconds=2.2):
    """A deep cinematic impact: falling sub tone, a hit of noise, a long tail."""
    rng = random.Random(3)
    n = int(seconds * RATE)
    out, phase, low = [], 0.0, 0.0
    for i in range(n):
        t = i / RATE
        freq = 38 + 70 * math.exp(-t * 9)
        phase += 2 * math.pi * freq / RATE
        sub = math.sin(phase) * math.exp(-t * 1.6)
        sub = math.tanh(sub * 2.2)
        low += 0.08 * (rng.uniform(-1, 1) - low)
        crack = low * 3 * math.exp(-t * 18)
        body = math.sin(2 * math.pi * 92 * t) * 0.35 * math.exp(-t * 6)
        out.append(sub + crack + body)
    return out


def shimmer(seconds=1.6):
    """A sparkle of magic: quick rising bell tones that ring out."""
    out = [0.0] * int(seconds * RATE)
    notes = [1318.5, 1568.0, 1975.5, 2637.0, 3136.0]
    for k, f in enumerate(notes):
        start = int(k * 0.07 * RATE)
        for i in range(start, len(out)):
            t = (i - start) / RATE
            env = math.exp(-t * 3.2) * min(1, t * 400)
            out[i] += (
                math.sin(2 * math.pi * f * t)
                + 0.3 * math.sin(2 * math.pi * f * 2.01 * t)
            ) * env * 0.4
    return out


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("whoosh.wav", whoosh())
    write("boom.wav", boom())
    write("shimmer.wav", shimmer())
    print("Wrote", sorted(os.listdir(OUT)))
