import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { callModel } from '../agents/watcher/agent/lib/model';
import type { Frame } from '../agents/watcher/agent/lib/contracts';
const env = await readFile('apps/web/.env.local', 'utf8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
}
const cases = [
  { clip: 'clip-1', skill: 'pack' },
  { clip: 'clip-3', skill: 'repack' },
  { clip: 'clip-2', skill: 'orientation' },
];
const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['nvidia/nemotron-3.5-super-vl', 'alibaba/qwen3.5-flash'];
await mkdir('runs', { recursive: true });
for (const model of models)
  for (const c of cases) {
    const dir = `runs/frames-${c.clip}`;
    await mkdir(dir, { recursive: true });
    execFileSync('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      `evals/recordings/${c.clip}.mp4`,
      '-vf',
      'fps=2,scale=768:-1',
      '-q:v',
      '4',
      `${dir}/%03d.jpg`,
    ]);
    const duration = Number(
      execFileSync('ffprobe', [
        '-v',
        'quiet',
        '-show_entries',
        'format=duration',
        '-of',
        'csv=p=0',
        `evals/recordings/${c.clip}.mp4`,
      ]).toString(),
    );
    const frames: Frame[] = [];
    for (let i = 0; i < Math.floor(duration * 2); i++) {
      try {
        frames.push({
          id: `f-${i * 500}`,
          time: i / 2,
          image:
            'data:image/jpeg;base64,' +
            (
              await readFile(`${dir}/${String(i + 1).padStart(3, '0')}.jpg`)
            ).toString('base64'),
        });
      } catch {
        break;
      }
    }
    const skill = await readFile(
      `agents/watcher/agent/skills/${c.skill}.md`,
      'utf8',
    );
    try {
      const r = await callModel({ frames, skill, model });
      await writeFile(
        `runs/${c.clip}-${model.replaceAll('/', '-')}.json`,
        JSON.stringify(r, null, 2),
      );
      console.log(
        JSON.stringify({
          clip: c.clip,
          model,
          seconds: r.latencyMs / 1000,
          cost: r.cost,
          steps: r.verdict.steps,
          request: r.verdict.request,
        }),
      );
    } catch (e) {
      console.log(JSON.stringify({ clip: c.clip, model, error: String(e) }));
    }
  }
