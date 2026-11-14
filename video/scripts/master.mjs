#!/usr/bin/env node
// Brings a rendered video to -15 LUFS with a limiter, leaving the picture untouched.
// Usage: node scripts/master.mjs <in.mp4> <out.mp4>
import { execFileSync, spawnSync } from 'node:child_process';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/master.mjs <in.mp4> <out.mp4>');
  process.exit(1);
}
const TARGET = -15;
const measured = spawnSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-nostats',
    '-i',
    input,
    '-vn',
    '-af',
    'ebur128',
    '-f',
    'null',
    '-',
  ],
  { encoding: 'utf8' },
).stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
const current = Number(measured.at(-1).match(/-?[\d.]+/)[0]);
const gain = TARGET - current;
execFileSync(
  'ffmpeg',
  [
    '-v',
    'error',
    '-y',
    '-i',
    input,
    '-c:v',
    'copy',
    '-af',
    `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false`,
    '-c:a',
    'aac',
    '-b:a',
    '256k',
    '-ar',
    '48000',
    '-movflags',
    '+faststart',
    output,
  ],
  { stdio: 'inherit' },
);
console.log(
  `mastered: ${current} LUFS -> ${TARGET} LUFS (${gain.toFixed(1)} dB)`,
);
