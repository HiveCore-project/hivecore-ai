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
          <span className="category">PHASE 2A · REAL RESEARCH</span>
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
                <p>{s.excerpt}</p>
                <small>SHA-256: {s.content_hash}</small>
              </details>
              {data.evidence
                .filter((e) => e.source_id === s.id)
                .map((e) => (
                  <div className="research-finding" key={e.id}>
                    <strong>{e.claim}</strong>
                    <blockquote>{e.excerpt}</blockquote>
                    <span className="status">{e.verdict} · AI assessment</span>
                    <p>{e.reasoning}</p>
                  </div>
                ))}
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
