import type { Verdict } from '../lib/contracts';

// A skill with an "Alert:" line describes something that should not happen.
export function alertName(skill: string) {
  return skill.match(/^Alert:[ \t]*(\S.*)$/m)?.[1].trim() ?? null;
}

// The alert is raised only once every step of the skill is verified. Evidence
// and order were already checked by the time a verdict gets here.
export function raisedAlert(skill: string, verdict: Verdict) {
  const name = alertName(skill);
  const ids = [...skill.matchAll(/^- ([\w-]+):/gm)].map((m) => m[1]);
  if (!name || !ids.length) return null;
  const steps = ids.map((id) => verdict.steps.find((s) => s.id === id));
  if (steps.some((s) => s?.status !== 'verified')) return null;
  return { name, steps: steps.map((s) => s!) };
}
