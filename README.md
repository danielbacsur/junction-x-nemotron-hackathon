# Lookout

A Next.js video-agent studio powered by NVIDIA Nemotron 3.5 Super VL through Vercel AI Gateway.

## Run

```sh
bun install
# Put AI_GATEWAY_API_KEY in apps/web/.env.local
bun run dev
```

Open http://localhost:3020 for development. The verified production build runs with `bun run --cwd apps/web start` at http://localhost:3021. Select a supplied recording, upload a video, or enable the camera. Choose a Markdown procedure and Analyze recording. The agent observes frames, can request a denser review, and returns timestamped evidence. Learn a skill drafts an editable procedure from footage; accept it in the skill editor before use.

All inference uses https://ai-gateway.vercel.sh. Google BYOK is sent server-side when configured. A successful Gemini response alone does not prove Google BYOK was used; Gateway may fall back to its own credentials. The supplied Google credential was tested through both Google and Vertex Gateway routes; generation metadata reported `is_byok: false`. Current Gemini use is funded by Gateway credits.

## Layout

- `apps/web`: Next.js UI, browser video capture and frame extraction, server routes.
- `agents/watcher/agent`: instructions, skills, model adapter, contracts, evidence tools.
- `agents/watcher/evals`: deterministic evidence and review boundary tests.
- `scripts/evaluate.ts`: real Gateway evaluations over the three supplied recordings.
- `scripts/negative-eval.ts`: recordings that must not complete a skill, either cut short or shown to the wrong skill (cases in `scripts/negative-cases.ts`).
- `runs`: ignored model results and extracted frames.

Media stays in the browser during upload and capture. Selected JPEGs are sent through Gateway. Completed runs and edited skills are stored in browser local storage. Uploaded-video URLs are currently session-scoped; export the recording before leaving. The original source recordings are never modified. Development fixtures are copied to ignored `apps/web/public/recordings`.

## Alerts

A skill can describe something that should not happen. Give it an `Alert:` line with the alert's name, and the studio raises that alert once every step of the skill is verified, with the frames that prove it:

```md
# Theft

Alert: Possible theft

- conceal: The person hides an item they were holding inside clothing on their own body.
```

Alerts use the same checks as any other skill: a step needs real frames as evidence, and the steps must be seen in order. On a live camera a raised alert stays on screen until it is dismissed, even after the moment has left the rolling window. `agents/watcher/agent/skills/theft.md` is the example; edit it or write your own in the Skills tab.

## Validation

```sh
bun run typecheck
bun test
bun run build
bun run eval
```

Evaluation results are shown in the Evaluations tab. They are small development-set checks, not a general accuracy benchmark. Billing estimates use published uncached token prices and may differ from actual billing.

## Runtime boundaries

One observation is active at a time. Source changes invalidate stale results. Each assessment includes explicit frame IDs. Unsupported evidence cannot advance a step. A recorded run may perform one denser review. Unobservable actions remain uncertain. Skills should distinguish historical actions from current conditions.

Live camera observes a rolling set of frames while recording the full session locally for replay. Stop the camera to analyze the complete recording. Camera access requires browser permission. Server keys never reach the browser.

## Deployment

Production: https://lookout-nemotron.vercel.app (Vercel project `danielbacsur2/lookout-nemotron`). Root Directory is `apps/web`, with Bun workspace installation and Node.js 24. Gateway credentials are stored as production and preview secrets. Instruction and skill files outside the app directory are included through Next.js output tracing.

Deploy from the repository root with `vercel deploy --prod --scope danielbacsur2`. The explicit `.vercelignore` excludes secrets, dependencies, build outputs, and local evaluation artifacts while including the three demo recordings in `apps/web/public/recordings`. These demo recordings are publicly accessible in this deployment; newly uploaded videos and camera recordings remain browser-local, with selected frames sent for inference.

The production smoke check verified the homepage, skills, health endpoint, demo media, and an actual Nemotron assessment of the packing recording (both steps verified with timestamped evidence).
