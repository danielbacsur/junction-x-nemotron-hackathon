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
const r = await fetch(
  `https://ai-gateway.vercel.sh/v1/generation?id=${encodeURIComponent(process.argv[2] || '')}`,
  { headers: { Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}` } },
);
const j = await r.json();
console.log(JSON.stringify(j));
