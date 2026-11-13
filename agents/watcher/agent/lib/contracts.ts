import { z } from 'zod';
export const MODELS = [
  {
    id: 'nvidia/nemotron-3.5-super-vl',
    name: 'Nemotron Super VL',
    detail: 'Core reasoning · NVIDIA',
    input: 0.2,
    output: 0.5,
  },
  {
    id: 'alibaba/qwen3.5-flash',
    name: 'Qwen 3.5 Flash',
    detail: 'Economy experiment',
    input: 0.1,
    output: 0.4,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini Flash Lite',
    detail: 'Experimental · Gateway',
    input: 0.1,
    output: 0.4,
  },
] as const;
export const frameSchema = z.object({
  id: z.string().max(80),
  time: z.number().nonnegative(),
  image: z.string().startsWith('data:image/jpeg;base64,').max(1_500_000),
});
export const verdictSchema = z.object({
  summary: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['verified', 'uncertain', 'not_observed', 'contradicted']),
      evidence: z.array(z.string()),
      observation: z.string(),
    }),
  ),
  events: z.array(
    z.object({
      time: z.number().nonnegative(),
      label: z.string(),
      detail: z.string(),
    }),
  ),
  request: z.object({
    needed: z.boolean(),
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    reason: z.string(),
  }),
  guidance: z.string(),
});
export type Frame = z.infer<typeof frameSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type Skill = {
  id: string;
  name: string;
  description: string;
  steps: { id: string; label: string }[];
  markdown: string;
};
export type Analysis = {
  id: string;
  model: string;
  verdict: Verdict;
  frames: Omit<Frame, 'image'>[];
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  createdAt: string;
  reviewed: boolean;
  generationId?: string;
  isByok?: boolean;
};
export const requestSchema = z.object({
  frames: z
    .array(frameSchema)
    .min(1)
    .max(40)
    .refine(
      (fs) =>
        new Set(fs.map((f) => f.id)).size === fs.length &&
        fs.every((f, i) => i === 0 || f.time >= fs[i - 1].time),
      'Frames need unique IDs and chronological timestamps',
    ),
  skill: z.string().min(10).max(15000),
  model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]),
  previous: z.string().max(20000).optional(),
  reviewed: z.boolean().optional(),
});
export function validateEvidence(verdict: Verdict, frames: Frame[]): Verdict {
  const ids = new Set(frames.map((f) => f.id));
  return {
    ...verdict,
    steps: verdict.steps.map((step) => {
      const evidence = step.evidence.filter((id) => ids.has(id));
      return {
        ...step,
        evidence,
        status:
          step.status === 'verified' && !evidence.length
            ? 'uncertain'
            : step.status,
      };
    }),
    events: verdict.events.filter(
      (e) =>
        e.time >= frames[0].time - 0.1 && e.time <= frames.at(-1)!.time + 0.1,
    ),
  };
}
