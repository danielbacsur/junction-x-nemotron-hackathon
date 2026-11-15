import type { Frame, Verdict } from './contracts';
export type Rule =
  | { kind: 'all'; ids: string[] }
  | { kind: 'without'; first: string; last: string; missing: string }
  | { kind: 'while'; action: string; state: string };
export function parseRule(skill: string): Rule {
  const ids = [...skill.matchAll(/^- ([\w-]+):/gm)].map((m) => m[1]);
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new Error('Skill needs unique step IDs');
  const line = skill.match(/^Alert when:[ \t]*(.+)$/m)?.[1]?.trim();
  let rule: Rule;
  const without = line?.match(/^([\w-]+) then ([\w-]+) without ([\w-]+)$/);
  const during = line?.match(/^([\w-]+) while ([\w-]+)$/);
  if (without)
    rule = {
      kind: 'without',
      first: without[1],
      last: without[2],
      missing: without[3],
    };
  else if (during)
    rule = { kind: 'while', action: during[1], state: during[2] };
  else if (!line || line === 'all steps in order') rule = { kind: 'all', ids };
  else throw new Error('Unsupported Alert when rule');
  const refs =
    rule.kind === 'all'
      ? rule.ids
      : rule.kind === 'without'
        ? [rule.first, rule.last, rule.missing]
        : [rule.action, rule.state];
  if (
    refs.some((id) => !ids.includes(id)) ||
    new Set(refs).size !== refs.length
  )
    throw new Error('Rule references invalid or repeated steps');
  return rule;
}
export function evaluateRule(
  skill: string,
  verdict: Verdict,
  frames: Pick<Frame, 'id' | 'time'>[],
) {
  const rule = parseRule(skill);
  const times = new Map(frames.map((f) => [f.id, f.time]));
  const step = (id: string) => verdict.steps.find((s) => s.id === id);
  const seen = (id: string) =>
    step(id)?.status === 'verified'
      ? (step(id)?.evidence ?? []).filter((e) => times.has(e))
      : [];
  if (rule.kind === 'all') {
    let cursor = -Infinity;
    for (const id of rule.ids) {
      const t = seen(id)
        .map((e) => times.get(e)!)
        .filter((t) => t > cursor)
        .sort((a, b) => a - b)[0];
      if (t === undefined) return false;
      cursor = t;
    }
    return true;
  }
  if (rule.kind === 'while')
    return seen(rule.action).some((id) => seen(rule.state).includes(id));
  if (step(rule.missing)?.status !== 'not_observed') return false;
  // Absence is only eligible for review over dense, uninterrupted observations.
  for (const a of seen(rule.first))
    for (const c of seen(rule.last)) {
      const start = times.get(a)!,
        end = times.get(c)!;
      const window = frames
        .filter((f) => f.time >= start && f.time <= end)
        .sort((a, b) => a.time - b.time);
      if (
        end - start >= 1 &&
        window.length >= 3 &&
        window.every((f, i) => i === 0 || f.time - window[i - 1].time <= 0.5)
      )
        return true;
    }
  return false;
}
