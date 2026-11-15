import { readFile, writeFile } from 'node:fs/promises';
import { callModel } from '../agents/watcher/agent/lib/model';
import { sample } from './frames';
import { cases } from './negative-cases';
for (const l of (await readFile('apps/web/.env.local', 'utf8')).split('\n')) {
  const i = l.indexOf('=');
  if (i > 0) process.env[l.slice(0, i)] = l.slice(i + 1);
}
const output = [];
for (const model of ['nvidia/nemotron-3.5-super-vl', 'alibaba/qwen3.5-flash'])
  for (const c of cases) {
    const frames = sample(c.clip, c.end);
    const skill = await readFile(
      `agents/watcher/agent/skills/${c.skill}.md`,
      'utf8',
    );
    for (const run of [1, 2, 3])
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
await writeFile('runs/negative-evals.json', JSON.stringify(output, null, 2));
