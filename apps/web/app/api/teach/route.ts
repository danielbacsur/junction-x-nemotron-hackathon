import { requestSchema } from '@agent/lib/contracts';
import { callModel } from '@agent/lib/model';
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success)
      return Response.json(
        { error: 'Invalid teaching recording' },
        { status: 400 },
      );
    const result = await callModel({
      ...parsed.data,
      skill:
        '# Discover a procedure\nInfer 2 to 6 concrete sequential actions demonstrated in these frames. Create stable kebab-case step IDs yourself. For each step, observation must be a short imperative completion condition suitable for a reusable skill (e.g. Hold the tall tube horizontally). Include only clearly visible actions; use uncertain for ambiguous actions. Do not require the same room, person, brand or clothing. No repetition unless the action demonstrably repeats. This is a draft to be edited by a human.',
    });
    const steps = result.verdict.steps.filter((s) => s.status === 'verified');
    if (!steps.length)
      throw new Error(
        'No clear procedure could be learned. Try a recording with visible actions.',
      );
    return Response.json({
      markdown:
        '# Learned procedure\nHuman-reviewed procedure drafted from a demonstration. Complete these historical actions in order. If an action is hidden, ask for a clearer view.\n' +
        steps.map((s) => `- ${s.id}: ${s.observation}`).join('\n'),
      analysis: result,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Teaching failed' },
      { status: 502 },
    );
  }
}
