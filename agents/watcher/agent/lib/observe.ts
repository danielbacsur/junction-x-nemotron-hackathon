import { callModel } from './model';
import { evaluateRule, parseRule } from './rules';
import { alertName } from '../tools/raise-alert';
export async function observe(
  args: Parameters<typeof callModel>[0],
  infer: typeof callModel = callModel,
) {
  if (alertName(args.skill)) parseRule(args.skill);
  const result = await infer(args);
  const name = alertName(args.skill);
  if (
    !name ||
    result.verdict.request.needed ||
    !evaluateRule(args.skill, result.verdict, args.frames)
  )
    return result;
  const confirmation = await infer({
    ...args,
    model: 'nvidia/nemotron-3.5-super-vl',
    confirmation: true,
    reviewed: true,
    previous: JSON.stringify(result.verdict),
  });
  result.cost += confirmation.cost;
  result.latencyMs += confirmation.latencyMs;
  result.inputTokens += confirmation.inputTokens;
  result.outputTokens += confirmation.outputTokens;
  const confirmed =
    !confirmation.verdict.request.needed &&
    evaluateRule(args.skill, confirmation.verdict, args.frames);
  result.alert = {
    name,
    confirmed,
    confirmationId: confirmation.id,
    evidence: [
      ...new Set(
        confirmation.verdict.steps
          .filter((s) => s.status === 'verified')
          .flatMap((s) => s.evidence),
      ),
    ],
  };
  result.verdict = confirmation.verdict;
  return result;
}
