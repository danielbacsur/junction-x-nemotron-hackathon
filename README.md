# Lookout

A Next.js video-agent studio powered by NVIDIA Nemotron 3.5 Super VL through Vercel AI Gateway.

## Run

```sh
bun install
# Put AI_GATEWAY_API_KEY in apps/web/.env.local
bun run dev
```

Open http://localhost:3020 for development. The verified production build runs with `bun run --cwd apps/web start` at http://localhost:3021. The studio has two separate modes. Recordings replays a supplied or uploaded video, or one captured with Record now: choose a Markdown procedure and Analyze recording. Observer watches the camera as it happens and raises alerts in realtime. The agent observes frames, can request a denser review, and returns timestamped evidence. Learn a skill drafts an editable procedure from footage; accept it in the skill editor before use.

All inference uses https://ai-gateway.vercel.sh. Google BYOK is sent server-side when configured. A successful Gemini response alone does not prove Google BYOK was used; Gateway may fall back to its own credentials. The supplied Google credential was tested through both Google and Vertex Gateway routes; generation metadata reported `is_byok: false`. Current Gemini use is funded by Gateway credits.

## Layout

- `apps/web`: Next.js UI, browser video capture and frame extraction, server routes.
- `agents/watcher/agent`: instructions, skills, model adapter, contracts, evidence tools.
- `agents/watcher/evals`: deterministic evidence and review boundary tests.
- `scripts/evaluate.ts`: real Gateway evaluations over the three supplied recordings.
- `scripts/negative-eval.ts`: recordings that must not complete a skill, either cut short or shown to the wrong skill (cases in `scripts/negative-cases.ts`).
- `runs`: ignored model results and extracted frames.

Media stays in the browser during upload and capture. Selected JPEGs are sent through Gateway. Completed runs and edited skills are stored in browser local storage. Uploaded-video URLs are currently session-scoped; export the recording before leaving. The original source recordings are never modified. The demo recordings live in `apps/web/public/recordings`.

## Alerts

A skill can describe something that should not happen. Give it an `Alert:` line with the alert's name, and the studio raises that alert once every step of the skill is verified, with the frames that prove it:

```md
# Theft

Alert: Possible theft

- conceal: The person hides an item they were holding inside clothing on their own body.
```

Alerts use the same checks as any other skill: a step needs real frames as evidence, and the steps must be seen in order. A raised alert flashes across the whole screen with a short sound. On a live camera it clears itself after a few seconds and can fire again ten seconds later; the same moment never raises it twice. On a recording the alert stays under the flash so its proof can be opened. `agents/watcher/agent/skills/theft.md` is the example; edit it or write your own in the Skills tab.

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

Record now captures a clip locally and sends nothing; when stopped, the clip joins the recordings for this session and is analyzed like any other. The observer sends a rolling set of recent frames every few seconds and records nothing. Camera access requires browser permission. Server keys never reach the browser.

## Deployment

Production: https://nemotron.danielbacsur.dev (Vercel project `danielbacsur2/junction-x-nemotron-hackathon`). Every push to `main` deploys it. Root Directory is `apps/web`, with Bun workspace installation and Node.js 24. Gateway credentials are stored as production and preview secrets. Instruction and skill files outside the app directory are included through Next.js output tracing.

The five demo recordings are committed under `apps/web/public/recordings`, so every deployment includes them. They are publicly accessible there; newly uploaded videos and camera recordings remain browser-local, with selected frames sent for inference. `.vercelignore` keeps secrets, dependencies, build outputs, local evaluation artifacts and the video project out of the build.

## Rule-driven observation and evidence review

Skills support `Alert: label` and one of these closed `Alert when:` forms:

- `all steps in order` (default for existing alert skills)
- `open then close without insert`
- `movement while open`

IDs must reference declared steps. Ordered rules require distinct chronological evidence moments; while rules require a shared frame. Missing-event rules only become candidates with a dense (maximum 0.5 second gap), at least one-second observed interval and an explicitly unobserved intermediate event. Occlusion must remain uncertain. Sampling checks cannot prove visual truth or payment status.

The server runs the rule and sends each candidate for an independent thinking-enabled Nemotron confirmation. Only confirmed alerts are displayed. The studio and live observer share the bounded closer-review flow; live review retrieves denser frames from the local buffer and carries the prior assessment within the current generation. It cannot recover unseen events.

Confirmed alerts are persisted to IndexedDB, including skill, verdict, confirmation ID and evidence images, before the UI or notification fires. `/alerts` supports human confirmation/dismissal and JSON export for evaluation. This is device-local evidence, not tamper-resistant centralized storage. Notifications require opt-in and an open page; no background monitoring is claimed.

## Source-grounded skill research

Set server-only `EXA_API_KEY` in addition to the Gateway key. In Skills, enter a practical task and select Draft from sources. Exa search fetches source text; Nemotron through Gateway drafts observable steps with supporting URLs and quotes. The server drops unsupported quotes. The user must review the procedure before activating it. Quote matching establishes provenance, not correctness or suitability. The Alerts view links to this same research flow for follow-up. Provider errors fail visibly; missing credentials never produce simulated sources.

This integration has deterministic quote-validation coverage but has not been exercised with live Exa credentials. See [Exa search API](https://exa.ai/docs/reference/search).

## Comparative evaluation

`bun scripts/benchmark.ts` compares a short plain-prompt arm with the harness on identical committed recording frames, reporting false advances, alert decisions, errors, token use and latency. Reports are append-only under ignored `runs/benchmarks/<commit>/<timestamp>.json`. The plain-prompt arm retains schema/provenance validation; it is not a raw unvalidated model baseline. Export reviewed alerts from `/alerts` to curate additional labeled fixtures before claiming improved accuracy. The existing published evaluation dashboard predates the new rule grammar and should not be treated as a measurement of these changes.

## Development provenance

Codex implemented the initial studio, browser capture/replay, Gateway adapter, teaching workflow, evidence validation and initial evals. Some later reconstructed commit trailers credit Claude on code initially produced with Codex; those trailers are not an exhaustive authorship record. Existing history is preserved. Current changes use actual commit timestamps.
