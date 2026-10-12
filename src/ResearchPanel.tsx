import type { ResearchSnapshot } from "../shared/research";
export function ResearchPanel({
  view,
  data,
}: {
  view: string;
  data: ResearchSnapshot | null;
}) {
  if (!data) return null;
  const showAll = view === "Colony";
  return (
    <section className="real-research" aria-label="Real research pipeline">
      <div className="research-gate">
        <div>
          <span className="category">PHASE 2B · EVIDENCE INTELLIGENCE</span>
          <h2>Explorer → Skeptic → Synthesizer</h2>
          <p>
            {data.enabled
              ? "One approved live run is available. Starting it sends research content to Cloudflare Workers AI."
              : data.reason}
          </p>
        </div>
        <span className="status">{data.usedToday}/3 started today · UTC</span>
      </div>
      {(view === "AI Agents" || showAll) && (
        <div className="workflow">
          {[
            {
              name: "EXPLORER",
              text: "Retrieves up to three permitted Wikipedia pages and extracts quoted findings.",
            },
            {
              name: "SKEPTIC",
              text: "Checks each finding against retrieved text and records contradictions and weak support.",
            },
            {
              name: "SYNTHESIZER",
              text: "Produces a cited report, preserving uncertainty and source retrieval timestamps.",
            },
          ].map((a) => (
            <div key={a.name}>
              <span>{a.name}</span>
              <p>{a.text}</p>
              <small>Real pipeline role · runs only with approval</small>
            </div>
          ))}
        </div>
      )}
      {(view === "Evidence Network" || showAll) && (
        <div className="real-evidence">
          <h3>Claim → evidence → source</h3>
          <p>
            Verdicts are AI assessments. Exact quote matching verifies
            provenance, not truth. Single-source support needs independent
            research.
          </p>
          {data.evidence.map((e) => (
            <article className="research-source" key={e.id}>
              <strong>{e.claim}</strong>
              <p>
                <span className="status">
                  {e.verdict.replaceAll("_", " ")} · AI assessment
                </span>
              </p>
              {!e.assessment_version && !e.flags ? (
                <p>
                  Legacy Phase 2A result · not reassessed. Mission #001 contains
                  human-identified errors; its original output is preserved.
                </p>
              ) : (
                <>
                  <p>
                    {e.support_scope?.replaceAll("_", " ")} ·{" "}
                    {e.needs_research
                      ? "Further research needed"
                      : "Human review required"}
                  </p>
                  <small>
                    Model verdict:{" "}
                    {e.model_verdict?.replaceAll("_", " ") || "Awaiting review"}{" "}
                    · checks version {e.assessment_version || "2B extraction"}
                  </small>
                  {JSON.parse(e.flags || "[]").map((flag: string) => (
                    <p key={flag}>Review flag: {flag}</p>
                  ))}
                </>
              )}
              <p>{e.reasoning}</p>
              {(data.links || [])
                .filter((l) => l.evidence_id === e.id)
                .map((link, i) => {
                  const source = data.sources.find(
                    (s) => s.id === link.sourceId,
                  );
                  return (
                    <div className="research-finding" key={i}>
                      <span className="category">
                        {link.relation} evidence →{" "}
                        {source?.title || "Source outside current window"}
                      </span>
                      <blockquote>{link.excerpt}</blockquote>
                      <small>
                        Excerpt characters {link.start}–{link.end} · UTF-16, end
                        exclusive
                      </small>
                      {source && (
                        <p>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            Original source ↗
                          </a>{" "}
                          · Retrieved{" "}
                          {new Date(source.retrieved_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              {!e.assessment_version && !e.flags && (
                <blockquote>{e.excerpt}</blockquote>
              )}
            </article>
          ))}
          <h3>Retrieved sources & evidence</h3>
          {!data.sources.length && <p>No real sources retrieved yet.</p>}
          {data.sources.map((s) => (
            <article key={s.id} className="research-source">
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title} ↗
              </a>
              <small>
                Retrieved {new Date(s.retrieved_at).toLocaleString()} · Mission{" "}
                {s.mission_id.slice(0, 8)}
              </small>
              <details>
                <summary>Retrieved excerpt and provenance</summary>
                <p className="report-content">{s.excerpt}</p>
                <small>
                  Complete retained excerpt · bounded to 4,500 characters, not
                  the full article. HTML text extraction can lose formula
                  formatting.
                </small>
                <small>SHA-256: {s.content_hash}</small>
              </details>
            </article>
          ))}
        </div>
      )}
      {(view === "Intelligence Reports" || showAll) && (
        <div>
          <h3>Real research reports</h3>
          {!data.reports.length && (
            <p>
              No completed real reports. Failed runs never receive a placeholder
              report.
            </p>
          )}
          {data.reports.map((r) => (
            <details className="research-source" key={r.id}>
              <summary>
                {r.title} · {new Date(r.created_at).toLocaleString()}
              </summary>
              <p className="report-content">{r.body}</p>
              {data.sources
                .filter((s) => s.mission_id === r.mission_id)
                .map((s) => (
                  <a
                    className="report-source-link"
                    href={s.url}
                    key={s.id}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.title} ↗
                  </a>
                ))}
            </details>
          ))}
        </div>
      )}
      {(view === "Colony Activity" || showAll) && (
        <div>
          <h3>Actual AI usage</h3>
          <p>
            Unknown means the provider did not supply a metric or the run
            predates tracking. Call reservations are not token counts. No neuron
            or cost estimate is inferred.
          </p>
          {!(data.usage || []).length && <p>No AI call records.</p>}
          {(data.usage || []).map((u, i) => (
            <article className="research-source" key={i}>
              <strong>
                Mission {u.mission_id.slice(0, 8)} · {u.role || "Legacy run"}
              </strong>
              <p>
                {u.ai_calls}/3 call reservations for mission ·{" "}
                {u.status || "metrics unavailable"}
              </p>
              <p>
                Input tokens: {u.prompt_tokens ?? "unknown"} · Completion
                tokens: {u.completion_tokens ?? "unknown"} · Total tokens:{" "}
                {u.total_tokens ?? "unknown"}
              </p>
            </article>
          ))}
          <h3>Real agent activity</h3>
          {!data.activity.length && <p>No real agent activity recorded yet.</p>}
          {data.activity.map((a) => (
            <article className="activity-item" key={a.id}>
              <div>
                <span className="category">
                  {a.agent} · {a.mission_id.slice(0, 8)}
                </span>
                <p>{a.message}</p>
              </div>
              <time>{new Date(a.created_at).toLocaleString()}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
