import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { callModel } from '../agents/watcher/agent/lib/model';
import { sample } from './frames';
const env = await readFile('apps/web/.env.local', 'utf8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
}
const cases = [
  { clip: 'clip-1', skill: 'pack' },
  { clip: 'clip-3', skill: 'repack' },
  { clip: 'clip-2', skill: 'orientation' },
  { clip: 'clip-4', skill: 'theft' },
  { clip: 'clip-5', skill: 'theft' },
];
const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['nvidia/nemotron-3.5-super-vl', 'alibaba/qwen3.5-flash'];
await mkdir('runs', { recursive: true });
for (const model of models)
  for (const c of cases) {
    const frames = sample(c.clip);
    const skill = await readFile(
      `agents/watcher/agent/skills/${c.skill}.md`,
      'utf8',
    );
    for (const run of [1, 2, 3])
      try {
        const r = await callModel({ frames, skill, model });
        await writeFile(
          `runs/${c.clip}-run${run}-${model.replaceAll('/', '-')}.json`,
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
