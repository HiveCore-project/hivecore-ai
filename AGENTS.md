# HIVECORE development instructions

- Phase 2B remains local-only. Do not deploy, purchase services, enable billing, or call paid APIs. Real Workers AI inference is remote even with a local Worker and requires explicit user approval for the first live test.
- Preserve React, Vite, TypeScript, Tailwind, Workers and D1 architecture.
- Mark all simulated agents, reports, sources, and activity DEMO. Saving a draft never starts AI. Real records must come from actual pipeline execution; never seed fictional real reports.
- Never commit credentials, .dev.vars, .env files, or .wrangler state.
- Use parameterized D1 statements and validate all API inputs server-side.
- Keep the loopback and Origin protections until real authentication, authorization and production security are designed.
- Run `npm test` and `npm run build` after changes. For API or schema changes also run migrations and `npm run test:integration` against the local Worker.
- Preserve accessible controls, mobile layouts, keyboard navigation, and reduced-motion support.
- The only permitted live adapter is `WorkersAIProvider` using native `env.AI` and `@cf/zai-org/glm-4.7-flash`. No fallback models, web-search tools, paid gateways, or retries.
- Default `npm run dev` has no AI binding. Never run `dev:live`, set live-enabling flags, or execute `test:live` before explicit live-test approval. Confirm Workers Free and a real operator User-Agent contact before the first approved run. Each approval authorizes one mission and is durably consumed.
- Keep the 3 UTC missions/day, 3 pages/mission, 3 AI calls/mission, 1,200 completion tokens/call, URL allowlist, robots handling, timeout and citation checks. All failures consume the reserved mission slot. Do not reset quota data or rotate approval IDs to bypass limits.
- Automated tests use mocked AI/fetch and in-memory SQLite only. Mock data must never be inserted into the user's real D1 database as real activity.

- Preserve the original Mission #001 report and JSON. Record corrections separately; never rewrite historical research as a new result.
- Phase 2B checks are heuristics, not proof of semantic correctness. Preserve full retained source excerpts through all roles and display unknown for missing usage metrics.
- Crypto direction is architecture-only until separately requested. Keep chain-family/provider adapters separate from generic evidence orchestration; do not add live crypto integrations during Phase 2B.
