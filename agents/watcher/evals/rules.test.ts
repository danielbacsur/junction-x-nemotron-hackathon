import { test, expect } from 'bun:test';
import { evaluateRule, parseRule } from '../agent/lib/rules';
import { observe } from '../agent/lib/observe';
import { groundDraft } from '../agent/lib/research';
import type { Verdict, Analysis, Frame } from '../agent/lib/contracts';
const frames: Frame[] = Array.from({ length: 5 }, (_, i) => ({
  id: 'f' + i,
  time: i / 2,
  image: 'data:image/jpeg;base64,x',
}));
const skill =
  '# Test\nAlert: Review\nAlert when: a then c without b\n- a: open\n- b: insert\n- c: close';
function verdict(): Verdict {
  return {
    summary: '',
    steps: [
      { id: 'a', status: 'verified', evidence: ['f0'], observation: '' },
      { id: 'b', status: 'not_observed', evidence: [], observation: '' },
      { id: 'c', status: 'verified', evidence: ['f4'], observation: '' },
    ],
    events: [],
    request: { needed: false, start: 0, end: 0, reason: '' },
    guidance: '',
  };
}
function analysis(v: Verdict): Analysis {
  return {
    id: crypto.randomUUID(),
    model: 'nvidia/nemotron-3.5-super-vl',
    verdict: v,
    frames,
    latencyMs: 1,
    inputTokens: 1,
    outputTokens: 1,
    cost: 0,
    createdAt: new Date().toISOString(),
    reviewed: false,
  };
}
test('missing event requires a dense interval and explicit non-observation', () => {
  expect(evaluateRule(skill, verdict(), frames)).toBe(true);
  expect(evaluateRule(skill, verdict(), [frames[0], frames[4]])).toBe(false);
  const v = verdict();
  v.steps[1].status = 'uncertain';
  expect(evaluateRule(skill, v, frames)).toBe(false);
});
test('while requires evidence from a shared moment', () => {
  const s = skill.replace('a then c without b', 'a while c');
  expect(evaluateRule(s, verdict(), frames)).toBe(false);
  const v = verdict();
  v.steps[2].evidence = ['f0'];
  expect(evaluateRule(s, v, frames)).toBe(true);
});
test('malformed rules fail closed', () => {
  expect(() =>
    parseRule(skill.replace('a then c without b', 'a then z without b')),
  ).toThrow();
});
test('second look can reject an alert and contributes usage', async () => {
  let calls = 0;
  const result = await observe(
    { frames, skill, model: 'nvidia/nemotron-3.5-super-vl' },
    async (args) => {
      calls++;
      const v = verdict();
      if (args.confirmation) v.steps[1].status = 'uncertain';
      return analysis(v);
    },
  );
  expect(calls).toBe(2);
  expect(result.alert?.confirmed).toBe(false);
  expect(result.inputTokens).toBe(2);
});
test('unsupported quotes are dropped', () => {
  const steps = [
    {
      id: 'open',
      condition: 'Open the container',
      url: 'https://example.com',
      quote: 'This is a fabricated instruction.',
    },
  ];
  expect(
    groundDraft({ steps }, [
      {
        url: 'https://example.com',
        title: 'Manual',
        text: 'Open the container and place it on a flat surface.',
      },
    ]),
  ).toEqual([]);
});
