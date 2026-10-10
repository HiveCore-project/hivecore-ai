ALTER TABLE missions ADD COLUMN source_urls TEXT NOT NULL DEFAULT '[]';
ALTER TABLE missions ADD COLUMN run_id TEXT;
ALTER TABLE missions ADD COLUMN started_at TEXT;
ALTER TABLE missions ADD COLUMN finished_at TEXT;
ALTER TABLE missions ADD COLUMN error TEXT;
ALTER TABLE sources ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';
ALTER TABLE sources ADD COLUMN content_hash TEXT;
ALTER TABLE evidence ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';
CREATE TABLE mission_runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL UNIQUE REFERENCES missions(id),
  approval_id TEXT NOT NULL UNIQUE,
  day TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d','now')),
  ai_calls INTEGER NOT NULL DEFAULT 0 CHECK(ai_calls BETWEEN 0 AND 3)
);
CREATE INDEX mission_runs_day ON mission_runs(day);
CREATE TABLE agent_activity (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  agent TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX activity_mission ON agent_activity(mission_id,created_at);
CREATE TRIGGER enforce_research_limits BEFORE INSERT ON mission_runs BEGIN
  SELECT CASE WHEN (SELECT count(*) FROM mission_runs WHERE day=strftime('%Y-%m-%d','now')) >= 3 THEN RAISE(ABORT,'Daily mission limit reached') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM missions WHERE status='running') THEN RAISE(ABORT,'Another mission is running') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM missions WHERE id=NEW.mission_id AND status='draft') THEN RAISE(ABORT,'Mission is not a draft') END;
END;
INSERT INTO agents(id,name,role,provider,is_demo) VALUES
 ('explorer','EXPLORER','Retrieve sources and extract evidence','workers-ai',0),
 ('skeptic','SKEPTIC','Assess support, contradictions and uncertainty','workers-ai',0),
 ('synthesizer','SYNTHESIZER','Produce a cited research report','workers-ai',0);
