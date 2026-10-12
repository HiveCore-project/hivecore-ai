# HIVECORE — Collective Intelligence, Evolved.

An original local research colony built with React, Vite, TypeScript, Tailwind CSS, Cloudflare Workers and D1.

Phase 1 provides seven responsive workspace sections and local mission drafts. Phase 2A adds a real, approval-gated EXPLORER → SKEPTIC → SYNTHESIZER pipeline using native Workers AI and `@cf/zai-org/glm-4.7-flash`.

Phase 2B adds traceable supporting/opposing evidence, four-state claim assessments, complete retained excerpts for synthesis, conservative quality checks and actual token usage (unknown when unavailable). Read [Phase 2B results and limitations](docs/PHASE_2B.md). The next direction is multi-chain crypto intelligence; [modular architecture](docs/MULTICHAIN_ARCHITECTURE.md) is design only, with no crypto integrations yet.

**Live inference is locked. No real AI calls were made during implementation. Nothing is publicly deployed and no paid services are enabled.**

## Start locally

Use Node 24 and npm. Default development needs no API keys, Cloudflare login or paid account.

```sh
npm install
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to the local Worker at http://127.0.0.1:8787. Both servers bind to loopback. Ctrl+C stops both. Ports must be available; Vite will not silently choose a different port.

D1 data persists under ignored `.wrangler/state/` across restarts. Migrations 0002 and 0003 preserve existing drafts and original Mission #001 results. The database UUID is a local placeholder, not a provisioned remote resource. Do not delete state to reset quotas or approvals.

## Working features and DEMO boundaries

| Feature                                          | Behavior                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Mission creation, search, category filtering     | Real local D1 drafts; optional permitted source URLs                                                                   |
| Real research start                              | Locked until explicit approval, Workers Free confirmation and native AI binding setup                                  |
| Explorer, Skeptic, Synthesizer                   | Implemented sequential real pipeline, Phase 2B verified offline; historical Mission #001 has documented factual errors |
| Source/evidence/report/activity panels           | Display persisted real pipeline records; empty before a real run                                                       |
| Colony topology and original four agent profiles | Clearly labeled DEMO                                                                                                   |
| Original report outlines and evidence diagram    | Clearly labeled DEMO                                                                                                   |

Saving a draft never calls AI. The separate Start action consumes one approved run. Real research errors remain visible; no fictional findings or reports are substituted. The home page's “100%” is a design principle, not a verification statistic.

## Verification

```sh
npm test
npm run build
# With the normal locked server running:
npm run test:integration
```

Automated pipeline tests use mocked AI/retrieval and isolated SQLite. No inference or paid resources are used. The integration test is read-only and creates no mission or draft. Mutation paths run only against isolated in-memory SQLite. `dist/` is the frontend build; it does not include a running API server.

## Real test and safety limits

Read [Phase 2A implementation and live-test instructions](docs/PHASE_2A.md) before any real test. `npm run test:live` is separate and refuses to run without opt-in. Do not enable or run it without a fresh explicit approval for one live mission.

The default config has no AI binding. The optional live config uses remote `env.AI`, local D1 and loopback HTTP. Each approval permits one mission. D1 enforces three starts per UTC day across this workspace and one running mission at a time. Each mission permits three pages, three AI calls and 1,200 completion tokens per call, with strict source/input limits and timeouts. Failed starts after reservation count toward the limit. No retries or paid fallbacks exist.

Initial retrieval accepts only English Wikipedia article URLs, checks robots.txt and respects request spacing. Arbitrary user-provided domains, private IPs and redirects are blocked. With no source URLs, use an exact Wikipedia article title; Explorer can discover relevant article links from it. Reports include actual retrieved source URLs, quotes, timestamps and uncertainty, and require human review.

## Structure

```text
src/                    React dashboard and real research panels
shared/                 Mission models, fixed limits and source URL policy
worker/index.ts         Loopback-only HTTP API
worker/retrieval.ts      Policy-aware bounded source retrieval
worker/ai.ts             Native Workers AI adapter and output validators
worker/research.ts       Sequential orchestration, quotas and persistence
migrations/             Users, agents, missions, sources, evidence, reports, runs, activity
scripts/live-test.mjs    One explicitly opted-in live mission (never in npm test)
tests/                  Offline tests and locked local API integration checks
```

Single local researcher only: no authentication or public multiuser support yet. No deployment script, billing setup, secret in client code or remote D1 provisioning is included. Future work includes authenticated ownership, durable job execution, separately reviewed source domains and human-reviewed report workflows.
