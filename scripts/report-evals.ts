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
    cases: negative.map((n: any) => ({
      name: n.case,
      passed: !!n.passed,
      falseAdvances: n.falseAdvances || [],
    })),
  });
}
await writeFile(
  'apps/web/public/evaluations.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Three supplied recordings and three truncated variants. Development fixtures, not a held-out benchmark. Cost is estimated from uncached list prices.',
      models,
    },
    null,
    2,
  ),
);
console.log('Updated evaluation report from recorded model responses.');
