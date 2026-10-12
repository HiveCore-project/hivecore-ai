# Phase 2B — evidence intelligence

Implemented and verified locally on 2026-10-12. No live inference, new local missions, paid services, deployment, or approval consumption was performed for Phase 2B. Mock missions exist only in isolated in-memory SQLite tests.

## What changed

- Explorer retains the complete bounded extracted source text for every role. Extraction prefers the last complete sentence within the unchanged 4,500-character cap. It does not fetch beyond the existing three-page allowance. Findings require an exact contiguous 20–500-character quote from a retrieved source, with explicit source identity. Heuristic flags identify unsupported theoretical-limit comparisons, changed numbers, unfamiliar units, possible reversed comparisons and lost qualifiers. Flags persist even if Skeptic fails.
- Skeptic must review every claim exactly once. Its schema distinguishes supported, contradicted, partially_supported and unverified. Every review contains 1–3 exact source spans labeled supporting, opposing or context. Contradicted requires an opposing span; supported requires support without opposition. The server derives UTF-16 start/end offsets (end exclusive); the model cannot invent locations. Repeated quotes resolve to their first occurrence. These are provenance constraints, not an entailment proof.
- Model verdict and effective verdict are separate. A supported model verdict with lexical warning flags becomes partially_supported, preserving the original assessment and explaining the warning. Source support is classified as single_source, multiple_sources_not_independently_verified or no_support. Multiple Wikipedia articles are never certified as independent corroboration.
- Synthesizer now receives all retained original excerpts, findings and assessments. Both summary and conclusions require valid evidence indexes. The server constructs citations from retrieved source records, including opposing sources, URLs, hashes and retrieval timestamps. Unknown references, unsupported numeric/comparison wording, unqualified uncertain conclusions and recognized absence assertions fail before a report is saved. No automatic repair call or retry occurs.
- Evidence Network shows claim-to-source relationships, supporting/opposing/context quotes, provenance, review flags, model/effective assessments and further-research status. Full retained excerpts are expandable. Historical Phase 2A output is labeled as legacy, not silently reassessed.
- Colony Activity shows actual provider-supplied prompt, completion and total tokens, with unknown for absent or invalid values. Zero is retained. Totals are not reconstructed from incomplete metrics. Failed/truncated responses retain any provided usage. A started entry after interruption means no response metrics were persisted; consumption remains unknown. Adapter status describes the response, not whether downstream validation passed. Mission error/status records the latter. Call reservations remain separate from token counts; no neuron or currency estimate is invented.

## Mission #001 corrections (human-reviewed, not a new AI report)

Original files and original D1 research remain unchanged. The saved Wikipedia excerpt supports the following corrections:

1. The commercial figures (11 W·h/kg or 40 kJ/kg) are compared with **often-cited specific energies**, not established theoretical maxima. The stronger original finding was unsupported.
2. The retained text includes lifetime **lasting decades** and round-trip efficiency **as high as 90%**. The original claim that these data were absent was incorrect. These remain claims from one source, not independently verified performance guarantees.
3. The retained text describes **first-generation steel flywheels on mechanical bearings**. The original claim that non-advanced materials/mechanisms were not described was incorrect.
4. All evidence came from one bounded Wikipedia excerpt. Agreement between roles did not add independent corroboration.

Source: [Wikipedia contributors — Flywheel energy storage](https://en.wikipedia.org/wiki/Flywheel_energy_storage), as retained on 2026-10-10T19:13:37.631Z; no new fetch was used for these corrections. The saved source hash is `f6e456a0600633ecc76594946815eaa37f8a5ebab490d67ac2457afeb3776b17`.

The original [test report](MISSION_001_TEST_REPORT.md) and [results](mission-001-results.json) remain the audit record. Corrections live here and in offline regressions; they are not presented as new agent activity.

## Storage and verification

Migration `0003_evidence_intelligence.sql` is additive: claim_assessments, claim_source_links, ai_usage and a nullable explorer_flags column. It does not rewrite the original evidence verdict CHECK constraint, historical reports, sources, approvals or mission quotas. The API joins Phase 2B assessments onto evidence; old rows retain their original verdicts. No historical token usage is backfilled.

```sh
npm run db:migrate
npm run dev
# In another terminal:
npm test
npm run build
npm run test:integration
```

Default development has no AI binding. Open http://127.0.0.1:5173/; the API is http://127.0.0.1:8787/. Integration is now read-only: it checks the locked API, schema, hashes, stored relationships, original historical results when present, and origin guard without creating drafts or starting missions. Mutation paths are exercised with mocks and in-memory SQLite.

The offline fixture `tests/fixtures/mission-001.json` contains the saved original excerpt and erroneous output. Tests cover all four human-review observations, exact spans, every verdict, duplicate/missing reviews, foreign source IDs, invented quotes, summary citations, uncertain conclusions, numerical/qualifier checks, usage values and failures. Pipeline tests verify full excerpts reach Synthesizer, new data persists, secrets stay out of snapshots, invalid reports are not saved, and safety limits remain enforced. SHA-256 regression checks protect both original Mission #001 files.

## Limits and remaining uncertainty

Deterministic checks validate structure/provenance and catch selected error patterns. They do **not** mathematically establish meaning, truth, source reliability or numerical equivalence. Lexical rules can reject legitimate phrasing and miss paraphrases, sophisticated exaggerations, mismatched units or context. Current unit checks are deliberately limited; there is no unit-conversion engine. Model-chosen supporting/opposing labels still require human review. Absence-assertion rejection is intentionally conservative, even for some true absence statements. Use scoped uncertainty and further-research needs instead.

Sources are still English Wikipedia only. Bounded paragraph extraction omits later sections/tables and may flatten mathematical superscripts or formulas (visible in the original cycle-count passage). Human reviewers should inspect the original article before relying on such numbers. The source is not an immutable revision URL; the saved timestamp, excerpt and hash identify what was reviewed. Three-page/multiclaim contexts can exceed the unchanged 28,000-byte prompt cap; the pipeline fails rather than silently trim evidence. Expanded JSON can exceed the 1,200-token output cap; truncation fails without retry. Phase 2B has not been evaluated with a live model.

All prior limits remain: three starts per UTC day in this D1, three source pages, three AI calls, 1,200 completion tokens each, robots/allowlist restrictions, timeouts, one-use explicit approvals and no paid fallback. No new approval was created. The default server remains locked. The 5 EUR maximum is unchanged; no spending occurred during this implementation.

## Next direction

HIVECORE will become a multi-chain crypto intelligence platform. The modular design is documented in [MULTICHAIN_ARCHITECTURE.md](MULTICHAIN_ARCHITECTURE.md). There are no blockchain integrations or network connectors in Phase 2B. The next step is to review adapter contracts, chain identity, finality/provenance requirements and an offline fixture strategy before authorizing implementation.

## Verification result — 2026-10-12

- 75 offline tests passed across three test files (mocked AI/fetch and in-memory SQLite).
- TypeScript checking and Vite production build passed.
- Migration 0003 applied successfully to local D1 only.
- Read-only local API integration passed, including original Mission #001 report/evidence preservation. The historical run remains three call reservations with unknown actual token metrics.
- Original Mission #001 Markdown and JSON SHA-256 checks passed unchanged.
- Default dev server is running at http://127.0.0.1:5173/ with local API on port 8787, live research disabled and no AI binding.
- Browser security policy blocked automated visual inspection of the local page. Visual layout has not been verified in this session; no browser-policy workaround was attempted.
- No inference, new local mission, approval ID, deployment, crypto integration or paid resource was used.
