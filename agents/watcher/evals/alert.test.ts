import { expect, test } from 'bun:test';
import { alertName, raisedAlert } from '../agent/tools/raise-alert';
import type { Verdict } from '../agent/lib/contracts';

const theft =
  '# Theft\n\nAlert: Possible theft\n\n- conceal: An item goes under the clothing.\n- leave: The person leaves the view.';
const verdict = (first: string, second: string): Verdict => ({
  summary: '',
  steps: [
    {
      id: 'conceal',
      status: first as never,
      evidence: ['f-1'],
      observation: '',
    },
    {
      id: 'leave',
      status: second as never,
      evidence: ['f-2'],
      observation: '',
    },
  ],
  events: [],
  request: { needed: false, start: 0, end: 0, reason: '' },
  guidance: '',
});

test('a skill names its alert on an "Alert:" line', () => {
  expect(alertName(theft)).toBe('Possible theft');
  expect(alertName('# Pack\n- pack-can: Insert the tube.')).toBeNull();
});
test('an alert needs every step verified', () => {
  expect(raisedAlert(theft, verdict('verified', 'verified'))?.name).toBe(
    'Possible theft',
  );
  expect(raisedAlert(theft, verdict('verified', 'uncertain'))).toBeNull();
  expect(raisedAlert(theft, verdict('not_observed', 'verified'))).toBeNull();
});
test('a procedure without an alert line never raises one', () => {
  const pack =
    '# Pack\n- conceal: Insert the tube.\n- leave: Put the bag away.';
  expect(raisedAlert(pack, verdict('verified', 'verified'))).toBeNull();
});
test('a step the model left out cannot raise an alert', () => {
  const partial = { ...verdict('verified', 'verified') };
  partial.steps = partial.steps.slice(0, 1);
  expect(raisedAlert(theft, partial)).toBeNull();
});
