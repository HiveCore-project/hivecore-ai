import {
  LIMITS,
  MODEL,
  type Finding,
  type Source,
  type ReportBody,
  type Review,
} from "../shared/research";
import type { Mission } from "../shared/mission";
import {
  WorkersAIProvider,
  validateFindings,
  validateReviews,
  validateReport,
  type RoleProvider,
} from "./ai";
import { retrieveSources, ResearchError } from "./retrieval";
export interface ResearchEnv {
  DB: D1Database;
  APP_MODE: string;
  AI?: Ai;
  LIVE_RESEARCH_ENABLED?: string;
  FREE_PLAN_CONFIRMED?: string;
  LIVE_APPROVAL_ID?: string;
  RESEARCH_USER_AGENT?: string;
}
export function liveGate(env: ResearchEnv): string {
  if (env.LIVE_RESEARCH_ENABLED !== "true")
    return "Live research is locked pending explicit approval of the first live test.";
  if (env.FREE_PLAN_CONFIRMED !== "true")
    return "Confirm the Cloudflare account is on Workers Free before enabling research.";
  if (
    !env.LIVE_APPROVAL_ID ||
    !/^[a-zA-Z0-9_-]{16,100}$/.test(env.LIVE_APPROVAL_ID)
  )
    return "A unique, one-use live approval ID is required.";
  if (!env.AI) return "The native Workers AI binding is not configured.";
  if (
    !env.RESEARCH_USER_AGENT ||
    !/^HIVECORE\/0\.2 \(.{8,180}\)$/.test(env.RESEARCH_USER_AGENT) ||
    !/(mailto:|https:\/\/)/.test(env.RESEARCH_USER_AGENT)
  )
    return "Configure an identifying HIVECORE User-Agent with a real operator contact URL or mailto address.";
  return "";
}
export async function expireInterrupted(db: D1Database) {
  const expired = await db
    .prepare(
      "UPDATE missions SET status='failed', error='Mission interrupted or exceeded its time budget. No automatic retry.', finished_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status='running' AND julianday(started_at)<julianday('now','-4 minutes') RETURNING id",
    )
    .all<{ id: string }>();
  for (const row of expired.results)
    await event(
      db,
      row.id,
      "SYSTEM",
      "Mission expired after interruption or timeout.",
    );
}
export async function event(
  db: D1Database,
  id: string,
  agent: string,
  message: string,
) {
  await db
    .prepare(
      "INSERT INTO agent_activity(id,mission_id,agent,message) VALUES (?,?,?,?)",
    )
    .bind(crypto.randomUUID(), id, agent, message)
    .run();
}
export async function reserveMission(
  env: ResearchEnv,
  id: string,
): Promise<string> {
  const runId = crypto.randomUUID();
  // D1 batch is transactional. The trigger and UNIQUE approval enforce global limits
  // across simultaneous requests, all users, and Worker restarts sharing this DB.
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO mission_runs(id,mission_id,approval_id) VALUES(?,?,?)",
    ).bind(runId, id, env.LIVE_APPROVAL_ID!),
    env.DB.prepare(
      "UPDATE missions SET status='running',run_id=?,started_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),error=NULL WHERE id=? AND status='draft'",
    ).bind(runId, id),
    ...["explorer", "skeptic", "synthesizer"].map((role) =>
      env.DB.prepare(
        "INSERT INTO mission_agents(mission_id,agent_id) VALUES (?,?)",
      ).bind(id, role),
    ),
  ]);
  return runId;
}
export function formatReport(
  body: ReportBody,
  findings: Finding[],
  reviews: Review[],
  sources: Source[],
  timestamp: string,
): string {
  const sourceNumber = (id: string) =>
    sources.findIndex((source) => source.id === id) + 1;
  return [
    body.summary,
    "\nFindings",
    ...body.findings.map(
      (f) =>
        `${f.text} ${f.evidenceIndexes.map((i) => `[${sourceNumber(findings[i].sourceId)}] (${reviews[i].verdict}; AI assessment)`).join(" ")}`,
    ),
    "\nEvidence review",
    ...findings.map(
      (finding, i) =>
        `${i + 1}. ${finding.claim}\nQuote: “${finding.excerpt}”\nAssessment: ${reviews[i].verdict} — ${reviews[i].reasoning} [${sourceNumber(finding.sourceId)}]`,
    ),
    "\nUncertainty and limitations",
    ...body.uncertainty.map((s) => `• ${s}`),
    "• AI-assisted synthesis, not independently verified truth. Wikipedia sources may share errors; agreement is not independent corroboration. Only bounded article excerpts were reviewed.",
    "\nSources (Wikipedia contributors; see each article for revision history and licensing)",
    ...sources.map(
      (s, i) =>
        `[${i + 1}] ${s.title}\n${s.url}\nRetrieved: ${s.retrieved_at}\nExcerpt SHA-256: ${s.content_hash}`,
    ),
    `\nGenerated: ${timestamp}\nModel: ${MODEL}`,
  ].join("\n\n");
}
export async function runResearch(
  env: ResearchEnv,
  mission: Mission,
  runId: string,
  deps?: { provider?: RoleProvider; retrieve?: typeof retrieveSources },
): Promise<void> {
  const signal = AbortSignal.timeout(LIMITS.missionMs);
  try {
    await event(
      env.DB,
      mission.id,
      "EXPLORER",
      "Started permitted-source retrieval.",
    );
    const sources = await (deps?.retrieve || retrieveSources)({
      missionId: mission.id,
      title: mission.title,
      objective: mission.objective,
      urls: JSON.parse(mission.source_urls || "[]"),
      userAgent: env.RESEARCH_USER_AGENT!,
      signal,
      onSource: async (s) => {
        await env.DB.prepare(
          "INSERT INTO sources(id,mission_id,url,title,retrieved_at,is_demo,excerpt,content_hash) VALUES(?,?,?,?,?,0,?,?)",
        )
          .bind(
            s.id,
            s.mission_id,
            s.url,
            s.title,
            s.retrieved_at,
            s.excerpt,
            s.content_hash,
          )
          .run();
      },
      onEvent: (message) => event(env.DB, mission.id, "EXPLORER", message),
    });
    const reserveCall = async () => {
      signal.throwIfAborted();
      const result = await env.DB.prepare(
        "UPDATE mission_runs SET ai_calls=ai_calls+1 WHERE id=? AND ai_calls<3 AND EXISTS(SELECT 1 FROM missions WHERE id=? AND status='running' AND run_id=?) RETURNING ai_calls",
      )
        .bind(runId, mission.id, runId)
        .first();
      if (!result)
        throw new ResearchError(
          "AI call budget exhausted or mission no longer active.",
        );
    };
    const provider =
      deps?.provider || new WorkersAIProvider(env.AI!, reserveCall);
    await event(
      env.DB,
      mission.id,
      "EXPLORER",
      "Extracting grounded findings from retrieved excerpts.",
    );
    const findings = validateFindings(
      await provider.run(
        "EXPLORER",
        { objective: mission.objective, sources },
        signal,
      ),
      sources,
    );
    signal.throwIfAborted();
    const evidenceIds = findings.map(() => crypto.randomUUID());
    await env.DB.batch(
      findings.map((f, i) =>
        env.DB.prepare(
          "INSERT INTO evidence(id,mission_id,source_id,claim,verdict,reasoning,is_demo,excerpt) VALUES(?,?,?,?,'unverified','Awaiting skeptic review',0,?)",
        ).bind(evidenceIds[i], mission.id, f.sourceId, f.claim, f.excerpt),
      ),
    );
    await event(
      env.DB,
      mission.id,
      "EXPLORER",
      `Saved ${findings.length} source-grounded findings.`,
    );
    await event(
      env.DB,
      mission.id,
      "SKEPTIC",
      "Reviewing support, contradictions and weak claims.",
    );
    const reviews = validateReviews(
      await provider.run(
        "SKEPTIC",
        { objective: mission.objective, sources, findings },
        signal,
      ),
      findings,
    );
    signal.throwIfAborted();
    await env.DB.batch(
      reviews.map((review) =>
        env.DB.prepare(
          "UPDATE evidence SET verdict=?,reasoning=? WHERE id=?",
        ).bind(review.verdict, review.reasoning, evidenceIds[review.index]),
      ),
    );
    await event(
      env.DB,
      mission.id,
      "SKEPTIC",
      "Evidence review saved. Verdicts are AI assessments, not independent verification.",
    );
    await event(
      env.DB,
      mission.id,
      "SYNTHESIZER",
      "Composing a report with validated evidence references.",
    );
    const report = validateReport(
      await provider.run(
        "SYNTHESIZER",
        { objective: mission.objective, findings, reviews },
        signal,
      ),
      findings,
    );
    signal.throwIfAborted();
    const timestamp = new Date().toISOString();
    const body = formatReport(report, findings, reviews, sources, timestamp);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO reports(id,mission_id,title,body,created_at,is_demo) SELECT ?,?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM missions WHERE id=? AND status='running' AND run_id=?)",
      ).bind(
        crypto.randomUUID(),
        mission.id,
        mission.title,
        body,
        timestamp,
        mission.id,
        runId,
      ),
      env.DB.prepare(
        "UPDATE missions SET status='completed',finished_at=? WHERE id=? AND run_id=? AND status='running'",
      ).bind(timestamp, mission.id, runId),
      env.DB.prepare(
        "INSERT INTO agent_activity(id,mission_id,agent,message) SELECT ?,?,'SYNTHESIZER','Research report saved; human review recommended.' WHERE EXISTS(SELECT 1 FROM missions WHERE id=? AND status='completed' AND run_id=?)",
      ).bind(crypto.randomUUID(), mission.id, mission.id, runId),
    ]);
  } catch (error) {
    const message = signal.aborted
      ? "Mission timed out. No automatic retry."
      : error instanceof ResearchError
        ? error.message
        : "Research failed safely. Check source availability, model access and the local database; no automatic retry.";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE missions SET status='failed',error=?,finished_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND run_id=? AND status='running'",
      ).bind(message, mission.id, runId),
      env.DB.prepare(
        "INSERT INTO agent_activity(id,mission_id,agent,message) VALUES (?,?,'SYSTEM',?)",
      ).bind(crypto.randomUUID(), mission.id, message),
    ]);
  }
}
