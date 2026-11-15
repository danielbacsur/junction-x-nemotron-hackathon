import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { callModel } from '../agents/watcher/agent/lib/model';
import { observeFrames } from '../agents/watcher/agent/lib/observation-loop';
import { observe } from '../agents/watcher/agent/lib/observe';
import { evaluateRule } from '../agents/watcher/agent/lib/rules';
import { alertName } from '../agents/watcher/agent/tools/raise-alert';
import { sample } from './frames';
import { cases } from './negative-cases';
for (const line of (await readFile('apps/web/.env.local', 'utf8')).split(
  '\n',
)) {
  const i = line.indexOf('=');
  if (i > 0)
    process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}
const commit = execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
const results = [];
for (const c of cases)
  for (const arm of ['plain-prompt', 'harness'] as const) {
    const frames = sample(c.clip, c.end),
      skill = await readFile(
        'agents/watcher/agent/skills/' + c.skill + '.md',
        'utf8',
      );
    try {
      const args = {
        frames,
        skill,
        model: process.argv[2] ?? 'nvidia/nemotron-3.5-super-vl',
      };
      const result =
        arm === 'harness'
          ? (
              await observeFrames(
                frames,
                (frames, previous, reviewed) =>
                  observe({
                    ...args,
                    frames,
                    previous: previous
                      ? JSON.stringify(previous.verdict)
                      : undefined,
                    reviewed,
                  }),
                (start, end) => Promise.resolve(sample(c.clip, end, start)),
              )
            ).result
          : await callModel({ ...args, baseline: true });
      results.push({
        case: c.name,
        arm,
        falseAdvance: result.verdict.steps.some(
          (s) => c.forbidden.includes(s.id) && s.status === 'verified',
        ),
        alert:
          arm === 'harness'
            ? !!result.alert?.confirmed
            : !!alertName(skill) && evaluateRule(skill, result.verdict, frames),
        expectedAlert: false,
        result,
      });
    } catch (e) {
      results.push({ case: c.name, arm, error: String(e) });
    }
  }
const dir = 'runs/benchmarks/' + commit;
await mkdir(dir, { recursive: true });
const file = dir + '/' + Date.now() + '.json';
await writeFile(
  file,
  JSON.stringify(
    {
      commit,
      at: new Date().toISOString(),
      note: 'Development fixtures; errors are not passes. Plain prompt uses the same schema and provenance validation.',
      results,
    },
    null,
    2,
  ),
);
console.log(file);
