#!/usr/bin/env python3
"""Synthesizes a backing track locally, cut to the video's scene timeline.

A fallback for `node scripts/audio.mjs music`, for when the ElevenLabs key
has no Music permission. Writes public/audio/music.mp3.

The track has four parts: a sparse intro, a drop on the reveal, a peak on the
"No dataset" cards and a final hit on the end card.

Usage: python3 scripts/music.py [--drop 15.033 --peak 42.883 --end 54.05 --total 59.75]
"""
import argparse
import pathlib
import subprocess
import wave

import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument("--drop", type=float, default=15.033)
parser.add_argument("--peak", type=float, default=42.883)
parser.add_argument("--end", type=float, default=54.05)
parser.add_argument("--total", type=float, default=59.75)
args = parser.parse_args()

RATE = 44100
BAR = 4 * 60 / 128
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(11)


def clock(n):
    return np.arange(n) / RATE


def noise(n):
    return rng.uniform(-1, 1, n)


def band(signal, low, high):
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / RATE)
    edge = lambda f, width: 1 / (1 + np.exp(-(freqs - f) / width))
    spectrum *= edge(low, max(low * 0.08, 5)) * (1 - edge(high, high * 0.08))
    return np.fft.irfft(spectrum, len(signal))


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def partials(freq, n, count, rolloff, damping=0.0, phases=False):
    """A saw-like tone. With damping, the upper partials die first, like a closing filter."""
    t, out = clock(n), np.zeros(n)
    for k in range(1, count + 1):
        if freq * k > 15000:
            break
        phase = rng.uniform(0, 2 * np.pi) if phases else 0
        part = np.sin(2 * np.pi * freq * k * t + phase) / k**rolloff
        out += part * np.exp(-t * k * damping) if damping else part
    return out


def kick(strength=1.0):
    n = int(0.42 * RATE)
    t = clock(n)
    body = np.sin(2 * np.pi * np.cumsum(46 + 130 * np.exp(-t / 0.028)) / RATE) * np.exp(-t / 0.16)
    click = band(noise(n), 1500, 6000) * np.exp(-t / 0.004) * 0.3
    return np.tanh((body + click) * 1.5) * strength


def clap():
    n = int(0.3 * RATE)
    t = clock(n)
    bursts = sum(np.exp(-np.maximum(t - d, 0) / 0.012) * (t >= d) for d in (0, 0.011, 0.023))
    return band(noise(n), 900, 5200) * (bursts * 0.5 + np.exp(-t / 0.09) * 0.6)


def hat(open_=False):
    n = int((0.24 if open_ else 0.06) * RATE)
    return band(noise(n), 7000, 16000) * np.exp(-clock(n) / (0.07 if open_ else 0.012))


def crash(seconds=2.2):
    n = int(seconds * RATE)
    return band(noise(n), 3500, 15000) * np.exp(-clock(n) / (seconds * 0.3))


def pluck(midi, seconds=0.34):
    n = int(seconds * RATE)
    return partials(hz(midi), n, 14, 1.0, damping=9.0) * np.exp(-clock(n) / 0.11)


def bass(midi, seconds):
    n = int(seconds * RATE)
    t = clock(n)
    tone = partials(hz(midi), n, 8, 1.2, damping=3.0) + 0.6 * np.sin(2 * np.pi * hz(midi) * t)
    return tone * np.minimum(1, t / 0.005) * np.exp(-t / (seconds * 0.7))


def lead(midi, seconds):
    n = int(seconds * RATE)
    t = clock(n)
    vibrato = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
    phase = 2 * np.pi * np.cumsum(hz(midi) * vibrato) / RATE
    tone = sum(np.sin(phase * k) / k**1.3 for k in range(1, 9))
    return tone * np.minimum(1, t / 0.012) * np.exp(-t / (seconds * 0.9))


def pad(midis, seconds, bright):
    n = int(seconds * RATE)
    t, out = clock(n), np.zeros((n, 2))
    for midi in midis:
        for detune, pan in ((-0.004, -0.7), (0.004, 0.7), (0, 0)):
            tone = partials(hz(midi) * (1 + detune), n, bright, 1.6, phases=True)
            out[:, 0] += tone * np.cos((pan + 1) * np.pi / 4)
            out[:, 1] += tone * np.sin((pan + 1) * np.pi / 4)
    envelope = np.minimum(1, t / 0.2) * np.minimum(1, (seconds - t) / 0.25)
    return out * envelope[:, None] / (len(midis) * 3)


def riser(seconds):
    n = int(seconds * RATE)
    t = clock(n) / seconds
    source, total = noise(n), np.zeros(n)
    edges = np.geomspace(200, 12000, 13)
    target = np.log(400 * 22**t)
    for low, high in zip(edges[:-1], edges[1:]):
        total += band(source, low, high) * np.exp(-(((np.log(np.sqrt(low * high)) - target) / 0.5) ** 2))
    pitch = np.sin(2 * np.pi * np.cumsum(160 + 1300 * t**2) / RATE) * 0.2
    return (total + pitch) * t**2


class Bus:
    def __init__(self):
        self.audio = np.zeros((int((args.total + 3) * RATE), 2))

    def add(self, at, samples, gain=1.0, pan=0.0):
        if samples.ndim == 1:
            samples = np.stack(
                [samples * np.cos((pan + 1) * np.pi / 4), samples * np.sin((pan + 1) * np.pi / 4)], axis=1
            )
        start = int(round(at * RATE))
        if start < 0:
            samples, start = samples[-start:], 0
        end = min(len(self.audio), start + len(samples))
        if end > start:
            self.audio[start:end] += samples[: end - start] * gain


drums, tonal, sparkle = Bus(), Bus(), Bus()
kicks = []

# Chord: (bass note, pad triad, arpeggio tones)
Am = (45, (57, 60, 64), (69, 72, 76, 81))
F = (41, (53, 57, 60), (65, 69, 72, 77))
C = (48, (55, 60, 64), (64, 67, 72, 76))
G = (43, (55, 59, 62), (67, 71, 74, 79))
ARP = [0, 2, 3, 2, 1, 2, 3, 2, 0, 2, 3, 2, 1, 3, 2, 3]
MELODY = {
    id(Am): [(0, 76, 1), (1, 81, 0.5), (1.5, 79, 0.5), (2, 76, 1), (3, 72, 1)],
    id(F): [(0, 77, 1), (1, 81, 0.5), (1.5, 79, 0.5), (2, 77, 1), (3, 72, 1)],
    id(C): [(0, 76, 1), (1, 79, 0.5), (1.5, 84, 0.5), (2, 79, 1), (3, 76, 1)],
    id(G): [(0, 74, 1), (1, 79, 0.5), (1.5, 83, 0.5), (2, 79, 1), (3, 74, 1)],
}


def arpeggio(at, bar, chord, gain, octave=0, steps=16):
    for i in range(steps):
        when = at + i * bar / steps
        midi = chord[2][ARP[i * 16 // steps]] + octave
        pan = 0.5 if i % 2 else -0.5
        sparkle.add(when, pluck(midi), gain, pan)
        sparkle.add(when + bar * 3 / 16, pluck(midi), gain * 0.32, -pan)
        sparkle.add(when + bar * 6 / 16, pluck(midi), gain * 0.12, pan)


def full_bar(at, bar, chord, level, melody=False, octave=0):
    """One bar of the full beat."""
    beat = bar / 4
    for b in range(4):
        drums.add(at + b * beat, kick(), 0.95 * level)
        kicks.append(at + b * beat)
        drums.add(at + (b + 0.5) * beat, hat(True), 0.2 * level, 0.25)
        for sixteenth in (0.25, 0.75):
            drums.add(at + (b + sixteenth) * beat, hat(), 0.11 * level, -0.25)
        tonal.add(at + (b + 0.5) * beat, bass(chord[0], beat * 0.48), 0.5 * level)
        tonal.add(at + (b + 0.75) * beat, bass(chord[0] + 12, beat * 0.24), 0.2 * level)
    for b in (1, 3):
        drums.add(at + b * beat, clap(), 0.42 * level)
    tonal.add(at, pad(chord[1], bar, 7), 0.5 * level)
    arpeggio(at, bar, chord, 0.2 * level, octave)
    if melody:
        for offset, midi, length in MELODY[id(chord)]:
            sparkle.add(at + offset * beat, lead(midi, length * beat), 0.14 * level)


# Intro: a filtered pulse, a few plucks, a heartbeat kick, then a rise into the drop.
progression = [Am, F, C, G]
intro_bars = int(args.drop // BAR)
intro = args.drop - intro_bars * BAR
for k in range(intro_bars):
    at, chord, beat = intro + k * BAR, progression[k % 4], BAR / 4
    tonal.add(at, pad(chord[1], BAR, 3), 0.42)
    for eighth in range(8):
        tonal.add(at + eighth * beat / 2, bass(chord[0], beat * 0.4), 0.22 + 0.02 * k)
        if k >= 2:
            drums.add(at + eighth * beat / 2, hat(), 0.05 + 0.012 * k, 0.3 if eighth % 2 else -0.3)
    if k >= 1:
        arpeggio(at, BAR, chord, 0.07 + 0.012 * k, steps=4 if k < 4 else 8)
    if k >= 4:
        for b in (0, 2):
            drums.add(at + b * beat, kick(), 0.5)
drums.add(args.drop - 3.6, riser(3.6), 0.3)
for i in range(16):
    drums.add(args.drop - BAR / 2 + i * BAR / 32, clap(), 0.1 + 0.022 * i)

# Drop: the full beat, from the reveal until just before the cards.
main_bars = int((args.peak - 0.9 - args.drop) // BAR)
drums.add(args.drop, crash(), 0.42)
for k in range(main_bars):
    full_bar(args.drop + k * BAR, BAR, progression[k % 4], 1.0, octave=12 if k >= 8 else 0)
    if k == 8:
        drums.add(args.drop + k * BAR, crash(1.6), 0.25)

# Break: the beat drops out and a rise carries into the cards.
gap_start = args.drop + main_bars * BAR
gap = args.peak - gap_start
tonal.add(gap_start, pad(F[1], gap, 5), 0.5)
drums.add(gap_start, riser(gap), 0.36)
rolls = max(4, int(gap / (BAR / 16)))
for i in range(rolls):
    drums.add(gap_start + i * gap / rolls, clap(), 0.08 + 0.3 * i / rolls)

# Peak: the same beat with a lead on top, timed to land on the end card.
peak_bars = max(1, round((args.end - args.peak) / BAR))
peak_bar = (args.end - args.peak) / peak_bars
peak_chords = [Am, F, C, G, F, G]
drums.add(args.peak, crash(), 0.45)
for k in range(peak_bars):
    full_bar(args.peak + k * peak_bar, peak_bar, peak_chords[k % 6], 1.08, melody=True, octave=12)
for i in range(8):
    drums.add(args.end - peak_bar / 4 + i * peak_bar / 32, clap(), 0.2 + 0.03 * i)

# Outro: one hit, then a ringing chord and an arpeggio that thins out under the tagline.
tail = args.total - args.end
drums.add(args.end, kick(), 1.0)
kicks.append(args.end)
drums.add(args.end, crash(3.2), 0.5)
ring = int((tail + 1.5) * RATE)
tonal.add(args.end, pad((48, 55, 60, 64, 67), tail + 1.5, 6) * np.exp(-clock(ring) / (tail * 1.1))[:, None], 1.25)
tonal.add(args.end, bass(36, 2.4), 0.8)
notes = (72, 76, 79, 84, 79, 76, 84, 88)
for i in range(int(tail / (BAR / 8))):
    when, midi, gain = args.end + i * BAR / 8, notes[i % len(notes)], 0.22 * 0.955**i
    sparkle.add(when, pluck(midi, 0.6), gain, 0.5 if i % 2 else -0.5)
    sparkle.add(when + BAR * 3 / 16, pluck(midi, 0.6), gain * 0.38, -0.5 if i % 2 else 0.5)

# The bass and pad duck under every kick.
duck = np.ones(len(tonal.audio))
for at in kicks:
    start = int(at * RATE)
    window = clock(min(int(0.3 * RATE), len(duck) - start))
    duck[start : start + len(window)] = np.minimum(duck[start : start + len(window)], 1 - 0.72 * np.exp(-window / 0.085))

mix = drums.audio + tonal.audio * duck[:, None] + sparkle.audio * (0.7 + 0.3 * duck[:, None])
mix = mix[: int(args.total * RATE)]
for channel in range(2):
    mix[:, channel] = band(mix[:, channel], 30, 17000)
mix = np.tanh(mix * 1.15)
fade = int(1.4 * RATE)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
mix = mix / np.max(np.abs(mix)) * 0.89

OUT.mkdir(parents=True, exist_ok=True)
wav = OUT / "music.wav"
with wave.open(str(wav), "wb") as file:
    file.setnchannels(2)
    file.setsampwidth(2)
    file.setframerate(RATE)
    file.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run(
    ["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "192k", str(OUT / "music.mp3")],
    check=True,
)
wav.unlink()
print(f"music: {len(mix) / RATE:.2f}s, drop {args.drop}s, peak {args.peak}s, end {args.end}s")
