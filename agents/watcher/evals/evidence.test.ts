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
