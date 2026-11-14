#!/usr/bin/env python3
"""Synthesizes the interface sound effects locally.

A fallback for `node scripts/audio.mjs sfx`, for when the ElevenLabs key
has no Sound Effects permission. Writes public/audio/sfx/<name>.mp3.

Usage: python3 scripts/sfx.py
"""
import pathlib
import subprocess
import wave

import numpy as np

RATE = 44100
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "audio" / "sfx"
rng = np.random.default_rng(7)


def clock(seconds):
    return np.arange(int(seconds * RATE)) / RATE


def noise(seconds):
    return rng.uniform(-1, 1, int(seconds * RATE))


def band(signal, low, high):
    """Keeps the frequencies between low and high, with soft edges."""
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / RATE)
    edge = lambda f, width: 1 / (1 + np.exp(-(freqs - f) / width))
    spectrum *= edge(low, max(low * 0.08, 5)) * (1 - edge(high, high * 0.08))
    return np.fft.irfft(spectrum, len(signal))


def decay(seconds, tau):
    return np.exp(-clock(seconds) / tau)


def tone(freq, seconds, tau):
    return np.sin(2 * np.pi * freq * clock(seconds)) * decay(seconds, tau)


def place(length, pieces):
    """Mixes (start_seconds, samples) pieces into one buffer."""
    buffer = np.zeros(int(length * RATE))
    for start, samples in pieces:
        i = int(start * RATE)
        samples = samples[: len(buffer) - i]
        buffer[i : i + len(samples)] += samples
    return buffer


def fade(signal, attack=0.002, release=0.01):
    a, r = int(attack * RATE), int(release * RATE)
    signal = signal.copy()
    signal[:a] *= np.linspace(0, 1, a)
    signal[-r:] *= np.linspace(1, 0, r)
    return signal


def key(strength=1.0):
    """One key press: a bright tick, a muted body and the release."""
    pitch = rng.uniform(0.85, 1.2)
    press = band(noise(0.03), 1800 * pitch, 7500) * decay(0.03, 0.004)
    body = tone(210 * pitch, 0.06, 0.012) * 0.55
    release = band(noise(0.02), 2500, 9000) * decay(0.02, 0.003) * 0.3
    return place(0.12, [(0, press), (0, body), (rng.uniform(0.05, 0.075), release)]) * strength


def typing(seconds=4.2):
    pieces, at = [], 0.01
    while at < seconds - 0.15:
        pieces.append((at, key(rng.uniform(0.55, 1.0))))
        # Bursts of quick keys with the odd pause between words.
        at += rng.uniform(0.045, 0.085) if rng.random() > 0.14 else rng.uniform(0.11, 0.17)
    return place(seconds, pieces)


def click():
    snap = band(noise(0.02), 1500, 9000) * decay(0.02, 0.0025)
    return fade(place(0.14, [(0, snap), (0, tone(1250, 0.09, 0.012) * 0.5), (0, tone(310, 0.1, 0.02) * 0.45)]))


def tick():
    return fade(place(0.09, [(0, tone(2350, 0.08, 0.011) * 0.7), (0, tone(4700, 0.05, 0.006) * 0.25)]))


def sweep(seconds, centre, width=0.42, bands=14):
    """Noise whose brightness follows `centre(t)`, as overlapping band layers."""
    source, t = noise(seconds), clock(seconds)
    edges = np.geomspace(180, 12000, bands + 1)
    target = np.log(centre(t / seconds))
    total = np.zeros(len(t))
    for low, high in zip(edges[:-1], edges[1:]):
        gain = np.exp(-(((np.log(np.sqrt(low * high)) - target) / width) ** 2))
        total += band(source, low, high) * gain
    return total


def whoosh():
    seconds = 0.62
    t = clock(seconds) / seconds
    shape = np.sin(np.pi * t) ** 1.6
    return fade(sweep(seconds, lambda x: 500 * (16 ** np.sin(np.pi * x))) * shape, 0.02, 0.05)


def impact():
    seconds = 1.5
    t = clock(seconds)
    freq = 42 + 95 * np.exp(-t / 0.05)
    sub = np.sin(2 * np.pi * np.cumsum(freq) / RATE) * np.exp(-t / 0.33)
    thump = band(noise(0.3), 60, 900) * decay(0.3, 0.035) * 0.7
    air = band(noise(seconds), 2500, 9000) * np.exp(-t / 0.12) * 0.12
    return fade(np.tanh((place(seconds, [(0, sub), (0, thump)]) + air) * 1.6), 0.001, 0.2)


def chime(notes, seconds, tau, gap):
    pieces = []
    for i, freq in enumerate(notes):
        note = tone(freq, seconds, tau) + 0.32 * tone(freq * 2, seconds, tau * 0.6) + 0.1 * tone(freq * 3, seconds, tau * 0.4)
        pieces.append((i * gap, fade(note, 0.003, 0.05)))
    return place(seconds + gap * len(notes), pieces)


def rewind():
    seconds = 1.45
    t = clock(seconds) / seconds
    whirr = sweep(seconds, lambda x: 700 * (5 ** x), width=0.3)
    flutter = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * np.cumsum(22 + 46 * t) / RATE))
    motor = np.sin(2 * np.pi * np.cumsum(240 + 900 * t) / RATE) * 0.18
    return fade((whirr * flutter + motor) * (0.5 + 0.5 * t), 0.03, 0.06)


def riser():
    seconds = 1.25
    t = clock(seconds) / seconds
    air = sweep(seconds, lambda x: 400 * (22 ** x), width=0.5)
    pitch = np.sin(2 * np.pi * np.cumsum(180 + 1500 * t**2) / RATE) * 0.22
    return fade((air + pitch) * t**2.2, 0.02, 0.004)


EFFECTS = {
    "typing": (typing, 0.8),
    "click": (click, 0.9),
    "tick": (tick, 0.5),
    "whoosh": (whoosh, 0.7),
    "impact": (impact, 0.95),
    "alert": (lambda: chime([1046.5, 1568.0, 1046.5, 1568.0], 0.5, 0.11, 0.13), 0.75),
    "success": (lambda: chime([659.3, 987.8], 0.9, 0.22, 0.09), 0.6),
    "rewind": (rewind, 0.6),
    "riser": (riser, 0.7),
}

OUT.mkdir(parents=True, exist_ok=True)
for name, (make, peak) in EFFECTS.items():
    samples = make()
    samples = samples / np.max(np.abs(samples)) * peak
    wav = OUT / f"{name}.wav"
    with wave.open(str(wav), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes((samples * 32767).astype(np.int16).tobytes())
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "192k", str(OUT / f"{name}.mp3")],
        check=True,
    )
    wav.unlink()
    print(f"{name}: {len(samples) / RATE:.2f}s")
