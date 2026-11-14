#!/usr/bin/env node
// Renders preview stills with a single bundle.
// Usage: node scripts/stills.mjs <outDir> <frame> [frame...]   (or "auto" for a spread over every scene)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outDir, ...wanted] = process.argv.slice(2);
const serveUrl = await bundle({
  entryPoint: path.join(root, 'src', 'index.ts'),
  publicDir: path.join(root, 'public'),
});
const composition = await selectComposition({ serveUrl, id: 'LookoutDemo' });
const frames =
  wanted[0] === 'auto'
    ? Array.from({ length: Number(wanted[1] ?? 40) }, (_, i, list) =>
        Math.round(((i + 0.5) / list.length) * composition.durationInFrames),
      )
    : wanted.map(Number);
console.log(`total frames: ${composition.durationInFrames}`);
for (const frame of frames) {
  await renderStill({
    composition,
    serveUrl,
    frame,
    scale: 0.5,
    output: path.join(outDir, `f${String(frame).padStart(5, '0')}.png`),
  });
}
console.log(`rendered ${frames.length} stills`);
