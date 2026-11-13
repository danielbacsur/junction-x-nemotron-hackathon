import { readFile, writeFile } from 'node:fs/promises';
import { callModel } from '../agents/watcher/agent/lib/model';
import type { Frame } from '../agents/watcher/agent/lib/contracts';
for (const l of (await readFile('apps/web/.env.local', 'utf8')).split('\n')) {
  const i = l.indexOf('=');
  if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1);
}
const cases = [
  {
    name: 'orientation-before-second-horizontal',
    clip: 'clip-2',
    skill: 'orientation',
    end: 8,
    forbidden: ['horizontal-again', 'second-can'],
  },
  {
    name: 'repack-before-replacement',
    clip: 'clip-3',
    skill: 'repack',
    end: 9,
    forbidden: ['replace-pringles'],
  },
  {
    name: 'packing-before-insertion',
    clip: 'clip-1',
    skill: 'pack',
    end: 0.5,
    forbidden: ['pack-can', 'put-away'],
  },
];
const output = [];
for (const model of ['google/gemini-2.5-flash-lite'])
  for (const c of cases) {
    const frames: Frame[] = [];
    for (let i = 0; i <= c.end * 2; i++) {
      frames.push({
        id: `f-${i * 500}`,
        time: i / 2,
        image:
          'data:image/jpeg;base64,' +
          (
            await readFile(
              `runs/frames-${c.clip}/${String(i + 1).padStart(3, '0')}.jpg`,
            )
          ).toString('base64'),
      });
    }
    const skill = await readFile(
      `agents/watcher/agent/skills/${c.skill}.md`,
      'utf8',
    );
    try {
      const r = await callModel({ model, frames, skill });
      const falseAdvances = r.verdict.steps.filter(
        (s) => c.forbidden.includes(s.id) && s.status === 'verified',
      );
      const row = {
        case: c.name,
        model,
        passed: !falseAdvances.length,
        falseAdvances: falseAdvances.map((s) => s.id),
        result: r,
      };
      output.push(row);
      console.log(
        JSON.stringify({
          case: c.name,
          model,
          passed: row.passed,
          steps: r.verdict.steps.map((s) => ({ id: s.id, status: s.status })),
          review: r.verdict.request,
        }),
      );
    } catch (e) {
      output.push({ case: c.name, model, error: String(e) });
      console.log(c.name, model, String(e));
    }
  }
await writeFile(
  'runs/negative-evals-google.json',
  JSON.stringify(output, null, 2),
);
