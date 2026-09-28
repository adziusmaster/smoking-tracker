"""Synthesises assets/sounds/pop.wav: a ~90 ms bubble pop, made from scratch (no licensing).

A short noise click for the "snap", then a sine chirp falling from 1100 Hz to 320 Hz under a fast
exponential decay. Mono, 16-bit, 44.1 kHz. Deterministic (seeded), so rebuilding gives the same file.

    python3 scripts/make-pop.py
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 44_100
DURATION = 0.09
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'sounds' / 'pop.wav'

rng = random.Random(7)
samples = []
phase = 0.0
n = int(RATE * DURATION)
for i in range(n):
    t = i / RATE
    freq = 320 + (1100 - 320) * math.exp(-t / 0.018)
    phase += 2 * math.pi * freq / RATE
    tone = math.sin(phase) * math.exp(-t / 0.028)
    click = (rng.random() * 2 - 1) * math.exp(-t / 0.0025) * 0.6
    fade = min(1.0, (n - i) / (RATE * 0.004))  # 4 ms fade-out, no click at the end
    samples.append(max(-1.0, min(1.0, (tone * 0.8 + click) * fade)))

OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(RATE)
    f.writeframes(b''.join(struct.pack('<h', int(s * 32_000)) for s in samples))
print(f'wrote {OUT} ({n} samples)')
