# First live mission preparation — 2026-10-10

Status: prepared for explicit approval of ONE mission; no inference executed.

## Concrete mission

- Title: Flywheel energy storage — first live test.
- Payload: `scripts/live-mission.json`, read directly by the existing opt-in test script.
- Source: https://en.wikipedia.org/wiki/Flywheel_energy_storage
- Objective: explain the mechanism using only retrieved evidence, identify supporting evidence, and state limitations and uncertainties.
- One article; up to three sequential model calls; 1,200 completion tokens per call (3,600 maximum for this mission). No retries, fallback models, paid gateways, or upgrades.

## Checks completed without inference

- Read `docs/PHASE_2A.md` and `AGENTS.md`.
- User confirmed Workers Free active, Workers Paid inactive, and no payment method. This is the user's verified account information, not inferred from Wrangler login.
- `npx wrangler whoami`: authenticated successfully.
- `npx wrangler ai models list --search glm-4.7-flash --json`: model returned by Cloudflare's catalog.
- `npx wrangler ai models schema @cf/zai-org/glm-4.7-flash`: schema retrieved; messages, max_completion_tokens, chat_template_kwargs and JSON response format present. These are metadata reads, not model runs.
- Node 24.14.1, D1 migrations current, 48 mocked tests passed, production build passed.
- Local API: live execution disabled; zero mission starts today; all three daily HIVECORE slots remain. This is the local application's quota, not an account-wide Cloudflare neuron balance.
- Source preflight: robots policy permits HIVECORE, no redirect, HTTP 200, HTML response, 432,291 decoded bytes and 4,500 usable excerpt characters on this check. The original Energy storage page exceeded the 750,000-byte limit and was replaced without raising the cap.
- Crawler contact: verified public project repository, `HIVECORE/0.2 (https://github.com/HiveCore-project/hivecore-ai)`. No personal email is used.

## Locked preparation

Ignored `.dev.vars` has `LIVE_RESEARCH_ENABLED=false`, `FREE_PLAN_CONFIRMED=true` (based on the user's confirmation), and the public-project User-Agent. No approval ID has been issued. The default running Worker has no AI binding. `dev:live` and the opted-in `test:live` have not been run.

After explicit approval, follow the existing procedure to issue one unique approval ID, enable the live-only configuration, run `test:live` once, inspect results, and return to locked development. The script creates the mission after approval; no duplicate prepared draft is needed.

Catalog/schema availability does not prove that a live call will succeed. Remote binding connectivity, runtime quota availability and model output quality can only be confirmed during the approved test. Exact remaining account-wide neuron balance was not exposed by the catalog/schema checks. Workers Free must remain active; quota failure must stop the run without upgrade or retry.

References: [model](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/), [free allocation and pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
