-- Additive only: original Phase 2A evidence, reports and quota records are untouched.
CREATE TABLE claim_assessments (
  evidence_id TEXT PRIMARY KEY REFERENCES evidence(id),
  verdict TEXT NOT NULL CHECK(verdict IN ('supported','contradicted','partially_supported','unverified')),
  model_verdict TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  flags TEXT NOT NULL,
  support_scope TEXT NOT NULL,
  needs_research INTEGER NOT NULL CHECK(needs_research IN (0,1)),
  assessment_version TEXT NOT NULL DEFAULT '2B'
);
CREATE TABLE claim_source_links (
  id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  relation TEXT NOT NULL CHECK(relation IN ('supporting','opposing','context')),
  excerpt TEXT NOT NULL,
  start_offset INTEGER NOT NULL CHECK(start_offset>=0),
  end_offset INTEGER NOT NULL CHECK(end_offset>start_offset)
);
CREATE INDEX claim_links_evidence ON claim_source_links(evidence_id);
CREATE TABLE ai_usage (
  run_id TEXT NOT NULL REFERENCES mission_runs(id),
  role TEXT NOT NULL CHECK(role IN ('EXPLORER','SKEPTIC','SYNTHESIZER')),
  status TEXT NOT NULL CHECK(status IN ('started','returned','failed')),
  prompt_tokens INTEGER CHECK(prompt_tokens>=0),
  completion_tokens INTEGER CHECK(completion_tokens>=0),
  total_tokens INTEGER CHECK(total_tokens>=0),
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(run_id,role)
);

ALTER TABLE evidence ADD COLUMN explorer_flags TEXT;
