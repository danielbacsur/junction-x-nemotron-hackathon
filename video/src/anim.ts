import type { CSSProperties } from 'react';
import { Easing, interpolate, spring } from 'remotion';
import { FPS } from './timeline';

export const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

export const out = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 0 → 1 over `length` frames, starting at `from`.
export const ramp = (frame: number, from: number, length = 20, easing = out) =>
  interpolate(frame, [from, from + length], [0, 1], { ...clamp, easing });

export const lerp = (progress: number, a: number, b: number) =>
  a + (b - a) * progress;

export const pop = (
  frame: number,
  from: number,
  damping = 13,
  stiffness = 170,
) =>
  spring({
    frame: frame - from,
    fps: FPS,
    config: { damping, stiffness, mass: 0.8 },
  });

// Fades and lifts an element into place.
export const rise = (
  frame: number,
  from: number,
  length = 26,
  distance = 30,
): CSSProperties => {
  const progress = ramp(frame, from, length);
  return {
    opacity: progress,
    transform: `translateY(${lerp(progress, distance, 0)}px)`,
  };
};

// Opacity for an element that is visible between two frames.
export const between = (frame: number, from: number, to: number, fade = 12) =>
  Math.min(ramp(frame, from, fade), 1 - ramp(frame, to - fade, fade));

export const timecode = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};
