import { readFile, writeFile, readdir } from 'node:fs/promises';
const models = [];
for (const model of [
  'nvidia/nemotron-3.5-super-vl',
  'alibaba/qwen3.5-flash',
  'google/gemini-2.5-flash-lite',
]) {
  const files = (await readdir('runs')).filter(
    (p) =>
      p.startsWith('clip-') && p.endsWith(model.replaceAll('/', '-') + '.json'),
  );
  const rows = await Promise.all(
    files.map(async (p) => JSON.parse(await readFile('runs/' + p, 'utf8'))),
  );
  const negative = JSON.parse(
    await readFile(
      model.startsWith('google')
        ? 'runs/negative-evals-google.json'
        : 'runs/negative-evals.json',
      'utf8',
    ),
  ).filter((r: any) => r.model === model);
  models.push({
    model,
    positivePasses: rows.filter((r) =>
      r.verdict.steps.every((s: any) => s.status === 'verified'),
    ).length,
    positiveCount: rows.length,
    negativePasses: negative.filter((n: any) => n.passed).length,
    negativeCount: negative.length,
    averageSeconds: Number(
      (rows.reduce((s, r) => s + r.latencyMs, 0) / rows.length / 1000).toFixed(
        2,
      ),
    ),
    totalCost: rows.reduce((s, r) => s + r.cost, 0),
    cases: [...new Set(negative.map((n: any) => n.case))].map((name) => {
      const runs = negative.filter((n: any) => n.case === name);
      return {
        name,
        passed: runs.every((n: any) => n.passed),
        falseAdvances: [
          ...new Set(runs.flatMap((n: any) => n.falseAdvances || [])),
        ],
      };
    }),
  });
}
await writeFile(
  'apps/web/public/evaluations.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Five supplied recordings, plus eight that must not complete a skill: cut before a step happens, or shown to the theft alert it must not fire on. Every case is run three times, because one look is not the same every time. Development fixtures, not a held-out benchmark. Cost is estimated from uncached list prices.',
      models,
    },
    null,
    2,
  ),
);
console.log('Updated evaluation report from recorded model responses.');
