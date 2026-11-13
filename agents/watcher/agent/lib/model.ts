import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  MODELS,
  verdictSchema,
  validateEvidence,
  type Frame,
  type Analysis,
} from './contracts';
const root = () =>
  process.cwd().endsWith('apps/web')
    ? path.resolve(process.cwd(), '../..')
    : process.cwd();
export async function instructions() {
  return readFile(
    path.join(root(), 'agents/watcher/agent/instructions.md'),
    'utf8',
  );
}
export async function callModel(args: {
  frames: Frame[];
  skill: string;
  model: string;
  previous?: string;
  reviewed?: boolean;
}): Promise<Analysis> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key)
    throw new Error(
      'AI Gateway is not connected. Add AI_GATEWAY_API_KEY to apps/web/.env.local.',
    );
  const start = Date.now();
  const content: unknown[] = [
    {
      type: 'text',
      text: `SKILL:\n${args.skill}\n${args.previous ? `Previous assessment (reassess against new evidence): ${args.previous}` : ''}\n${args.reviewed ? 'This is the requested closer review. Do not request another review; use uncertainty if unresolved.' : ''}`,
    },
  ];
  for (const f of args.frames)
    content.push(
      {
        type: 'text',
        text: `Frame ${f.id}, time ${f.time.toFixed(2)} seconds`,
      },
      { type: 'image_url', image_url: { url: f.image } },
    );
  let raw: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      'https://ai-gateway.vercel.sh/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            { role: 'system', content: await instructions() },
            { role: 'user', content },
          ],
          ...(args.model !== 'alibaba/qwen3.5-flash'
            ? {
                response_format: {
                  type: 'json_schema',
                  json_schema: {
                    name: 'video_observation',
                    strict: true,
                    schema: z.toJSONSchema(verdictSchema),
                  },
                },
              }
            : {}),
          max_tokens: 6000,
          temperature: 0.1,
          reasoning: { enabled: false },
        }),
        signal: AbortSignal.timeout(100000),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw new Error(
        `Gateway ${res.status}: ${body.replaceAll(key, '[redacted]').slice(0, 500)}`,
      );
    }
    raw = await res.json();
    break;
  }
  const text = raw?.choices?.[0]?.message?.content;
  if (typeof text !== 'string')
    throw new Error(
      'The model returned no usable answer. Try again with fewer frames.',
    );
  const clean = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  const first = clean.indexOf('{'),
    last = clean.lastIndexOf('}');
  let parsed;
  try {
    parsed = verdictSchema.parse(JSON.parse(clean.slice(first, last + 1)));
  } catch {
    throw new Error(
      'The model returned an invalid assessment. No steps were advanced. Please retry.',
    );
  }
  const verdict = validateEvidence(parsed, args.frames);
  const ids = [...args.skill.matchAll(/^- ([\w-]+):/gm)].map((m) => m[1]);
  if (
    ids.length &&
    (verdict.steps.length !== ids.length ||
      new Set(verdict.steps.map((s) => s.id)).size !== ids.length ||
      verdict.steps.some((s) => !ids.includes(s.id)))
  )
    throw new Error(
      'The model did not assess every procedure step correctly. No progress was accepted.',
    );
  const m = MODELS.find((m) => m.id === args.model)!;
  const inputTokens = raw.usage?.prompt_tokens ?? 0,
    outputTokens = raw.usage?.completion_tokens ?? 0;
  return {
    id: crypto.randomUUID(),
    model: args.model,
    verdict,
    frames: args.frames.map(({ id, time }) => ({ id, time })),
    latencyMs: Date.now() - start,
    inputTokens,
    outputTokens,
    cost: (inputTokens * m.input + outputTokens * m.output) / 1e6,
    createdAt: new Date().toISOString(),
    reviewed: !!args.reviewed,
  };
}
