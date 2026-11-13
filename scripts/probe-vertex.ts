import { readFile } from 'node:fs/promises';
const env = Object.fromEntries(
  (await readFile('apps/web/.env.local', 'utf8'))
    .trim()
    .split('\n')
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-lite',
    messages: [{ role: 'user', content: 'Say connected.' }],
    max_tokens: 30,
    providerOptions: {
      gateway: {
        only: ['vertex'],
        byok: { vertex: [{ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY }] },
      },
    },
  }),
});
const j = await res.json();
console.log(
  JSON.stringify({
    status: res.status,
    id: j.id,
    model: j.model,
    answer: j.choices?.[0]?.message?.content,
    error: j.error,
    metadata: j.providerMetadata,
  }),
);
