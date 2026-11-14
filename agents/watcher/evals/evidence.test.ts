import { describe, test, expect } from 'bun:test';
import { validateEvidence, type Verdict } from '../agent/lib/contracts';
const base: Verdict = {
  summary: 'test',
  steps: [
    {
      id: 'pack-can',
      status: 'verified',
      evidence: ['invented'],
      observation: 'test',
    },
  ],
  events: [{ time: 99, label: 'outside', detail: 'invalid' }],
  request: { needed: false, start: 0, end: 0, reason: '' },
  guidance: '',
};
describe('evidence provenance', () => {
  test('unsupported verification becomes uncertainty', () => {
    const v = validateEvidence(base, [{ id: 'f-0', time: 0, image: '' }]);
    expect(v.steps[0].status).toBe('uncertain');
    expect(v.steps[0].evidence).toEqual([]);
    expect(v.events).toEqual([]);
  });
  test('valid evidence is retained without claiming semantic truth', () => {
    const v = validateEvidence(
      { ...base, steps: [{ ...base.steps[0], evidence: ['f-0', 'invented'] }] },
      [{ id: 'f-0', time: 0, image: '' }],
    );
    expect(v.steps[0].status).toBe('verified');
    expect(v.steps[0].evidence).toEqual(['f-0']);
  });
});

import { validateOrder } from '../agent/lib/contracts';
test('later actions cannot be verified using earlier timestamps', () => {
  const v = {
    ...base,
    steps: [
      {
        id: 'first',
        status: 'verified' as const,
        evidence: ['f-2'],
        observation: 'first',
      },
      {
        id: 'second',
        status: 'verified' as const,
        evidence: ['f-1'],
        observation: 'second',
      },
    ],
  };
  const out = validateOrder(
    v,
    [
      { id: 'f-1', time: 1, image: '' },
      { id: 'f-2', time: 2, image: '' },
    ],
    ['first', 'second'],
  );
  expect(out.steps[1].status).toBe('uncertain');
  expect(out.summary).toContain('not fully supported');
});
