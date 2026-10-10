# Phase 2A — real research, locked until approval

Implementation uses native `env.AI.run('@cf/zai-org/glm-4.7-flash', ...)` only. No OpenAI/Claude APIs, API keys in frontend code, paid gateways, automatic purchases or public deployment. **No live inference has been performed during implementation.** Successful mocked tests do not certify remote account/model availability or report quality; those require the separately approved live test.

## Pipeline and truthful results

1. Create a normal mission draft with up to three optional permitted source URLs. A draft has no AI or network-retrieval side effects.
2. An explicit **Start real research** request passes the server gates and transactionally reserves a mission slot and one-use approval in D1. Only one mission may run at a time.
3. **EXPLORER** checks Wikipedia robots.txt, retrieves source pages serially, extracts paragraph text, saves excerpt hashes and timestamps, then makes one AI call to extract at most five findings. Every quoted excerpt must exactly occur in the saved source excerpt; every source ID must exist.
4. **SKEPTIC** makes one AI call to review every finding against the source excerpts, retaining supported/disputed/unverified assessments and reasons. These are AI assessments, not independent truth verification.
5. **SYNTHESIZER** makes one AI call for a structured report. Citation indexes must refer to existing evidence. Source URLs, retrieval times, model identity and report time are attached by server code, never invented by the model. Review verdicts and a general limitation are always retained in the final report.
6. D1 stores real sources, evidence, activity and the final report. Mission state changes to completed or failed. Dashboard polls every four seconds and shows the real records above the separately labeled DEMO panels.

Malformed/truncated model output, tool requests, invented source IDs/quotes, unknown citations, retrieval failures and exhausted quotas fail closed. No fake report or automatic fallback appears. Previously retrieved sources/findings remain inspectable after failure. Semantic accuracy still requires human review: a model can draw a mistaken inference from a real quote.

## Allowed sources

Phase 2A permits only `https://en.wikipedia.org/wiki/Article` pages, including user-supplied URLs. Exact hostname matching excludes arbitrary hosts, IP literals, localhost, cloud metadata addresses and DNS names controlled by users. Credentials, non-default ports, query strings, namespace pages, nested encoding and redirects are rejected. General user-provided websites are intentionally unsupported until each domain's access policy and SSRF controls are reviewed.

With no URLs, the mission title is used as an exact Wikipedia article title (spaces become underscores). Explorer discovers relevant permitted article links from that page, ranking links by objective keywords. This is bounded article-link discovery, not full web search. Supply explicit article URLs for descriptive mission titles. Missing/redirected pages fail; no alternate URLs are guessed after failure.

robots.txt is fetched for each mission, checked with `robots-parser`, and retrieval fails on unavailable/invalid policy responses or a disallowed path. Requests identify HIVECORE with a real operator contact. Spacing is at least one second or the declared crawl delay; delays over ten seconds fail rather than violate the policy. HTTP 429 and other errors stop the mission without retrying. Wikipedia contributors are attributed in reports, with URLs to article history/licensing. This does not grant permission for other domains.

Only decoded HTML/text is processed. Scripts/styles/navigation are removed; no browser execution occurs. Source content, objectives and previous model output are explicitly treated as untrusted data in model prompts. No tools are provided to the model. Model output is rendered as escaped text, not executable HTML.

## Hard limits

| Limit                                        | Enforcement                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| 3 mission starts per UTC day                 | D1 trigger on the shared `mission_runs` table; failures count        |
| One-use live approval                        | Unique `approval_id` in D1, persists across restarts                 |
| One running mission globally                 | D1 trigger, transactionally with reservation                         |
| 3 article fetch attempts per mission         | Serial bounded retrieval; robots.txt is an additional policy request |
| 750,000 decoded bytes per page               | Stream read limit; no unbounded response buffering                   |
| 4,500 source characters per page             | Stored and model-visible excerpt cap                                 |
| 3 AI requests per mission                    | Atomic persisted counter before each call; no retries                |
| 28,000 UTF-8 bytes per AI input              | Enforced before submission, includes instructions and evidence       |
| 1,200 completion tokens per call             | `max_completion_tokens`; reasoning disabled                          |
| 12 seconds per fetch, 45 seconds per AI call | Abort signals and model timeout; no retry                            |
| 210 seconds per mission                      | Shared deadline, checked before subsequent operations                |
| Interrupted run recovery                     | After four minutes, reads/start requests mark stale runs failed      |

The daily cap is global to **this HIVECORE D1 database**, not per user or browser. Both development configs use the same local database ID/state. Multiple independent checkouts/databases cannot enforce an account-wide cap; do not run separate live instances or erase `.wrangler/state` to reset quotas. Public deployment would require one shared authoritative database and authentication.

Aborting an inference cannot guarantee immediate cancellation on Cloudflare's side; an already-started call may consume its bounded allowance. Its reservation remains spent and no replacement call occurs. The free-plan confirmation is an operator assertion, not an automated billing API check. Verify the account in Cloudflare before enabling; never use Workers Paid or prepaid gateway credits for this project.

## Default local development — no remote AI binding

Use Node 24 (the SQLite tests use Node's built-in `node:sqlite`).

```sh
npm install
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:5173. Normal `wrangler.jsonc` contains no AI binding. The dashboard shows the reason real execution is locked. Migrations preserve existing Phase 1 drafts.

```sh
npm test
npm run build
# Against the normal, locked development server:
npm run test:integration
```

Unit/pipeline tests mock AI and fetch, using actual migration SQL against isolated in-memory SQLite. They do not use real sources, inference or local mission quotas. The integration command creates one labeled draft in local D1 and verifies the live-start lock without inference. Test fixtures never become real reports.

## One real test — only AFTER explicit user approval

Do not run these steps as part of automated verification. They are a checklist for the separately approved test.

1. Obtain approval for **one** real mission. Confirm the intended Cloudflare account is on **Workers Free**, with remaining daily free allocation, and this model is available without billing. If the platform requires payment, stop. Never enable Workers Paid, prepaid credits or paid gateways.
2. Authenticate Wrangler using the account's normal login flow if needed. No token belongs in Git or the browser app.
3. Stop the normal dev process to release ports 5173/8787. Create an ignored `.dev.vars` in the repository with the following settings. Use a new random approval ID only for this approved run and a real operator contact (the example contact below is a placeholder):

```dotenv
LIVE_RESEARCH_ENABLED=true
FREE_PLAN_CONFIRMED=true
LIVE_APPROVAL_ID=<unique-random-id-of-16-to-100-letters-digits-underscores-or-hyphens>
RESEARCH_USER_AGENT="HIVECORE/0.2 (mailto:YOUR_REAL_OPERATOR_EMAIL)"
```

4. Run `npm run dev:live`. This uses the separate `wrangler.live.jsonc` with `ai: { binding: 'AI', remote: true }`, while D1 and the HTTP server remain local. Starting remote bindings may require Cloudflare authentication; it is not a public deployment. No inference is requested merely by loading the dashboard.
5. Choose **either** one dashboard Start action **or** the following opt-in test, never both:

```powershell
$env:HIVECORE_LIVE_TEST = 'I_APPROVE_ONE_REAL_MISSION'
npm run test:live
Remove-Item Env:HIVECORE_LIVE_TEST
```

The script creates one Energy storage mission with one explicit Wikipedia source, starts it exactly once, and asserts completion and a saved report. The approval is consumed even if retrieval/AI fails. Inspect its citations and quota usage; any new mission requires a new approval. Do not rotate the ID to retry without approval.

6. Stop `dev:live`, remove the live-enabling entries from `.dev.vars`, and return to `npm run dev`. Preserve the D1 state and consumed approval record. Report real outcome and usage without calling a failed test successful.

Cloudflare states that Workers Free includes a daily allocation of 10,000 neurons and fails further inference when it is exhausted. Our application caps bound workload; they do not predict exact neuron consumption or certify the current account plan. See [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [GLM-4.7-Flash schema](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/), [local bindings](https://developers.cloudflare.com/workers/local-development/bindings-per-env/), and [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).

## API and files

- `POST /api/missions`: validated draft and optional `sourceUrls` array.
- `POST /api/missions/:id/start`: approval-gated synchronous run; requires `X-Hivecore-Live: approved`. Returns 403 when locked, 409 on reservation conflict, 200 on completion, 502 on pipeline failure. Transport failure does not imply rollback; consult the stored state.
- `GET /api/missions`: statuses, errors and timestamps.
- `GET /api/research`: execution gate, daily usage, real sources/evidence/reports/activity.
- `worker/retrieval.ts`: URL policy, robots, rate spacing, bounded HTML extraction.
- `worker/ai.ts`: fixed-model native binding adapter and output validators.
- `worker/research.ts`: orchestration, D1 reservations, persistence and error recovery.
- `migrations/0002_research.sql`: non-destructive Phase 2A schema upgrade.
- `src/ResearchPanel.tsx`: real pipeline views, independent of DEMO content.

Execution remains a bounded open HTTP request, not a production queue. Local process shutdown may interrupt it; stale recovery marks it failed with no replay. Authentication, durable queues, broader sources and public deployment remain future work.
