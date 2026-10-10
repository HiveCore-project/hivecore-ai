# First approved live test — 2026-10-10

**Outcome: failed before mission creation. No inference ran.**

The user authorized one Flywheel energy storage mission. The existing `dev:live` configuration was started once with a private one-use approval in ignored local settings. Cloudflare rejected remote binding preview startup because this account does not have a registered workers.dev subdomain. The failing API operation was `workers/subdomain/edge-preview`.

`npm run test:live` was invoked exactly once. Its initial read of the local research gate failed with `ECONNREFUSED 127.0.0.1:8787`, because the live server had exited. The script never reached mission creation or the start endpoint. No automatic retry was performed and no account onboarding, deployment, upgrade, paid service or extra mission was attempted.

## Requested outputs

1. Explorer findings: none; Explorer never ran.
2. Skeptic results: none; Skeptic never ran.
3. Synthesizer report: none; Synthesizer never ran.
4. Real citations/evidence: none produced by this test. The planned Wikipedia article was checked during preparation, not retrieved by a mission.
5. AI usage: zero requests. No inference token or neuron usage was incurred by this test. Remote startup and model catalog metadata are not inference.
6. Final mission status: not created / not started. Test attempt failed at infrastructure startup; it is not a completed or failed research record in D1.

## Cleanup and verification

- Set `LIVE_RESEARCH_ENABLED=false` and removed the private approval ID from `.dev.vars`.
- Removed the shell's live-test opt-in variable.
- Restarted normal `npm run dev`, which has no AI binding.
- Local API confirmed live research disabled, zero mission starts today, no real sources/evidence/reports/activity, and no prepared Flywheel mission record.
- D1 run/call totals were checked without selecting private approval IDs.

The app remains available locally at http://127.0.0.1:5173/. Another test requires resolving the Cloudflare remote-preview prerequisite and obtaining fresh explicit approval; this attempt will not be replayed automatically.
