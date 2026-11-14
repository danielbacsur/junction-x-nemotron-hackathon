#!/usr/bin/env node
// Generates the video's audio with ElevenLabs.
// Usage: ELEVENLABS_API_KEY=... node scripts/audio.mjs <vo|music|sfx> [--force] [--length <seconds>] [--only <id>]
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = 'https://api.elevenlabs.io';
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Set ELEVENLABS_API_KEY.');
  process.exit(1);
}
const [command, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(`--${name}`);
const option = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? undefined : rest[i + 1];
};
const script = JSON.parse(
  await readFile(path.join(root, 'script.json'), 'utf8'),
);
const out = (...parts) => path.join(root, 'public', 'audio', ...parts);

async function post(url, body) {
  const response = await fetch(`${api}${url}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `${url} -> ${response.status}: ${(await response.text()).slice(0, 400)}`,
    );
  }
  return response;
}

const duration = (file) =>
  Number(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ]).toString(),
  );

// Groups the character alignment into words with start and end times.
function words(alignment) {
  const list = [];
  let current = null;
  alignment.characters.forEach((character, i) => {
    if (/\s/.test(character)) {
      if (current) list.push(current);
      current = null;
      return;
    }
    const start = alignment.character_start_times_seconds[i];
    const end = alignment.character_end_times_seconds[i];
    if (!current) current = { w: '', s: start, e: end };
    current.w += character;
    current.e = end;
  });
  if (current) list.push(current);
  return list.map((word) => ({
    w: word.w,
    s: Number(word.s.toFixed(3)),
    e: Number(word.e.toFixed(3)),
  }));
}

async function vo() {
  await mkdir(out('vo'), { recursive: true });
  const manifestPath = path.join(root, 'src', 'vo.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(await readFile(manifestPath, 'utf8'))
    : {};
  const only = option('only');
  const { segments } = script;
  for (const [i, segment] of segments.entries()) {
    const file = out('vo', `${segment.id}.mp3`);
    if (only && only !== segment.id) continue;
    if (
      !only &&
      existsSync(file) &&
      manifest[segment.id]?.text === segment.text &&
      !flag('force')
    ) {
      console.log(`skip ${segment.id}`);
      continue;
    }
    const response = await post(
      `/v1/text-to-speech/${script.voice.id}/with-timestamps?output_format=mp3_44100_128`,
      {
        text: segment.text,
        model_id: script.model,
        voice_settings: script.settings,
        previous_text: segments[i - 1]?.text,
        next_text: segments[i + 1]?.text,
      },
    );
    const data = await response.json();
    await writeFile(file, Buffer.from(data.audio_base64, 'base64'));
    manifest[segment.id] = {
      text: segment.text,
      file: `audio/vo/${segment.id}.mp3`,
      duration: Number(duration(file).toFixed(3)),
      words: words(data.alignment),
    };
    console.log(`${segment.id}: ${manifest[segment.id].duration}s`);
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function music() {
  await mkdir(out(), { recursive: true });
  const seconds = Number(option('length') ?? 55);
  const response = await post('/v1/music?output_format=mp3_44100_128', {
    prompt: script.music.prompt,
    music_length_ms: Math.round(seconds * 1000),
    model_id: 'music_v1',
    force_instrumental: true,
  });
  const file = out(option('name') ?? 'music.mp3');
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  console.log(`music: ${duration(file).toFixed(2)}s -> ${file}`);
}

async function sfx() {
  await mkdir(out('sfx'), { recursive: true });
  const only = option('only');
  for (const effect of script.sfx) {
    const file = out('sfx', `${effect.id}.mp3`);
    if (only && only !== effect.id) continue;
    if (!only && existsSync(file) && !flag('force')) {
      console.log(`skip ${effect.id}`);
      continue;
    }
    const response = await post(
      '/v1/sound-generation?output_format=mp3_44100_128',
      {
        text: effect.text,
        duration_seconds: effect.duration,
        prompt_influence: effect.influence,
      },
    );
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    console.log(`${effect.id}: ${duration(file).toFixed(2)}s`);
  }
}

const commands = { vo, music, sfx };
if (!commands[command]) {
  console.error(
    'Usage: node scripts/audio.mjs <vo|music|sfx> [--force] [--length <seconds>] [--only <id>]',
  );
  process.exit(1);
}
await commands[command]();
