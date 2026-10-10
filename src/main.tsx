import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Hexagon,
  Orbit,
  Radio,
  ScanLine,
  Network,
  FileText,
  Activity,
  Plus,
  X,
  Search,
  ChevronRight,
  Command,
  Menu,
  Globe,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { categories, type Mission } from "../shared/mission";
import type { ResearchSnapshot } from "../shared/research";
import { ResearchPanel } from "./ResearchPanel";
import "./styles.css";

const pages = [
  "Home",
  "Colony",
  "Research Missions",
  "AI Agents",
  "Evidence Network",
  "Intelligence Reports",
  "Colony Activity",
] as const;
type Page = (typeof pages)[number];
const icons = [Hexagon, Orbit, ScanLine, Radio, Network, FileText, Activity];
const agents = [
  {
    name: "ATLAS",
    role: "Discovery agent",
    description:
      "Maps a question into research paths and identifies potential sources.",
    color: "#69eee0",
    x: 28,
    y: 32,
  },
  {
    name: "PRISM",
    role: "Verification agent",
    description:
      "Checks the relationship between a claim and its supporting evidence.",
    color: "#ab91ff",
    x: 72,
    y: 27,
  },
  {
    name: "NEXUS",
    role: "Synthesis agent",
    description:
      "Connects findings across disciplines into a structured perspective.",
    color: "#69eee0",
    x: 78,
    y: 69,
  },
  {
    name: "ECHO",
    role: "Review agent",
    description:
      "Looks for contradictions, missing context, and unanswered questions.",
    color: "#ab91ff",
    x: 22,
    y: 73,
  },
];
const examples = [
  {
    title: "The next era of clean energy",
    category: "Climate",
    text: "An illustrative map of energy storage, grid resilience, and emerging technologies.",
    code: "HC–001",
    progress: 72,
  },
  {
    title: "Open models. New possibilities.",
    category: "Technology",
    text: "A sample investigation into open AI ecosystems and their research potential.",
    code: "HC–002",
    progress: 48,
  },
  {
    title: "Rethinking urban ecosystems",
    category: "Society",
    text: "A demonstration of how a colony might explore more resilient cities.",
    code: "HC–003",
    progress: 89,
  },
];

function ColonyMap({ large = false }: { large?: boolean }) {
  const [selected, setSelected] = useState(0);
  return (
    <div className={`colony-map ${large ? "large" : ""}`}>
      <div className="map-grid" />
      <div className="map-caption">
        <span className="signal" /> COLONY TOPOLOGY{" "}
        <span className="demo">DEMO</span>
      </div>
      <svg
        className="connections"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <ellipse cx="50" cy="50" rx="35" ry="34" />
        <ellipse cx="50" cy="50" rx="24" ry="23" />
        {agents.map((a) => (
          <g key={a.name}>
            <line x1="50" y1="50" x2={a.x} y2={a.y} />
            <circle r=".65" fill={a.color}>
              <animateMotion
                dur="5s"
                repeatCount="indefinite"
                path={`M ${a.x},${a.y} L 50,50`}
              />
            </circle>
          </g>
        ))}
        <path d="M28 32L72 27L78 69L22 73Z" />
      </svg>
      <div className="core">
        <Hexagon size={43} />
        <span>HIVECORE</span>
        <small>RESEARCH CORE</small>
      </div>
      {agents.map((a, i) => (
        <button
          key={a.name}
          className={`agent-node ${selected === i ? "selected" : ""}`}
          style={
            {
              left: `${a.x}%`,
              top: `${a.y}%`,
              "--node": a.color,
            } as React.CSSProperties
          }
          onClick={() => setSelected(i)}
          aria-label={`Inspect ${a.name}`}
          aria-pressed={selected === i}
        >
          <span>
            <Radio size={18} />
          </span>
          <strong>{a.name}</strong>
          <small>{a.role.split(" ")[0]}</small>
        </button>
      ))}
      <div className="map-detail">
        <span style={{ color: agents[selected].color }}>
          ◈ {agents[selected].name}
        </span>
        <span>{agents[selected].role} · simulated node</span>
      </div>
      <span className="map-coordinate">
        SYS / 01.04 &nbsp; · &nbsp; INTERACTIVE VIEW
      </span>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("Home");
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [report, setReport] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [research, setResearch] = useState<ResearchSnapshot | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/missions");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { missions: Mission[] };
      setMissions(data.missions);
      const researchResponse = await fetch("/api/research");
      if (!researchResponse.ok) throw new Error();
      setResearch((await researchResponse.json()) as ResearchSnapshot);
    } catch {
      setResearch(null);
      setError(
        "Cannot reach local D1. Start the local API and run the database migration.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 4000);
    return () => window.clearInterval(timer);
  }, []);
  async function startMission(id: string) {
    if (starting || !research?.enabled) return;
    setStarting(id);
    setNotice(
      "Starting real research. This can take up to 3½ minutes. Progress is recorded in Colony Activity.",
    );
    try {
      const response = await fetch(`/api/missions/${id}/start`, {
        method: "POST",
        headers: { "X-Hivecore-Live": "approved" },
      });
      const result = (await response.json()) as {
        mission?: Mission;
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.error ||
            result.mission?.error ||
            "Research did not complete. Check the activity log.",
        );
      setNotice(
        "Real research completed. Open Intelligence Reports to read the cited report.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Connection interrupted. Check mission status before taking any action.",
      );
    } finally {
      setStarting(null);
      await load(true);
    }
  }
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  function navigate(next: Page) {
    setPage(next);
    setMobile(false);
    setReport(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function createMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(data),
          sourceUrls: String(data.get("sourceUrls") || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const result = (await res.json()) as { mission: Mission; error?: string };
      if (!res.ok)
        throw new Error(result.error || "Mission could not be saved.");
      setMissions((old) => [result.mission, ...old]);
      setModal(false);
      form.current?.reset();
      setNotice(
        "Mission draft saved to local D1. Starting real research is a separate, approval-gated action.",
      );
      navigate("Research Missions");
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Unable to save. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  const filtered = missions.filter(
    (m) =>
      (filter === "All" || m.category === filter) &&
      `${m.title} ${m.objective}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          href="#home"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("Home");
          }}
        >
          <div className="brand-symbol">
            <Hexagon />
            <span />
          </div>
          <span>
            HIVECORE<small>COLLECTIVE INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">H</div>
          <div>
            Research workspace<small>Local environment</small>
          </div>
          <span className="signal" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {pages.map((p, i) => {
            const Icon = icons[i];
            return (
              <button
                key={p}
                className={page === p ? "active" : ""}
                onClick={() => navigate(p)}
              >
                <Icon size={18} />
                {p}
                {p === "Research Missions" && (
                  <span className="count">{missions.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="phase-card">
            <Sparkles size={18} />
            <strong>A new kind of intelligence.</strong>
            <p>
              Built to explore together.
              <br />
              Designed to go further.
            </p>
            <span>
              PHASE 2A <i>FOUNDATION</i>
            </span>
          </div>
          <div className="local-user">
            <div>LR</div>
            <span>
              Local researcher<small>Personal workspace</small>
            </span>
            <Command size={15} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment">
              <span className="signal" /> LOCAL DEVELOPMENT
            </span>
            <span className="top-divider" />
            <span className="avatar">LR</span>
          </div>
        </header>
        <main>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {page === "Home" ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span /> THE NEXT FRONTIER OF RESEARCH
                  </div>
                  <h1>
                    One question.
                    <br />A colony of
                    <br />
                    <span>possibilities.</span>
                  </h1>
                  <p>
                    Turn curiosity into collective intelligence.
                    <br />A new space for specialized AI agents to explore,
                    <br className="desktop-break" /> connect, and make sense of
                    what comes next.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="primary"
                      onClick={() => {
                        setFormError("");
                        setModal(true);
                      }}
                    >
                      Create a mission <ArrowUpRight size={17} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => navigate("Colony")}
                    >
                      Explore the colony <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="hero-note">
                    <ShieldCheck size={14} /> Phase 2A preview <span>·</span>{" "}
                    Live AI requires approval
                  </div>
                </div>
                <div className="hero-visual">
                  <ColonyMap />
                  <div className="visual-footer">
                    <span>INDEPENDENT MINDS. SHARED DISCOVERY.</span>
                    <span>01 — ∞</span>
                  </div>
                </div>
              </section>
              <section className="metrics">
                {[
                  {
                    label: "Your missions",
                    value: String(missions.length).padStart(2, "0"),
                    note: "Saved in local D1",
                    icon: ScanLine,
                  },
                  {
                    label: "Specialized agents",
                    value: "04",
                    note: "Demo role architecture",
                    icon: Radio,
                  },
                  {
                    label: "Evidence-first",
                    value: "100%",
                    note: "Design principle · not a metric",
                    icon: Network,
                  },
                  {
                    label: "An open frontier",
                    value: "∞",
                    note: "Questions worth exploring",
                    icon: Globe,
                  },
                ].map((m) => (
                  <div className="metric" key={m.label}>
                    <div>
                      <m.icon size={16} />
                      <span>{m.label}</span>
                    </div>
                    <strong>{m.value}</strong>
                    <small>{m.note}</small>
                  </div>
                ))}
              </section>
              <section className="missions-section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow muted">
                      EXPLORE THE POSSIBILITIES
                    </div>
                    <h2>Big questions start here.</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("Research Missions")}
                  >
                    All missions <ArrowRight size={16} />
                  </button>
                </div>
                <div className="example-grid">
                  {examples.map((m, i) => (
                    <button
                      className="example-card"
                      key={m.code}
                      onClick={() => {
                        navigate("Intelligence Reports");
                        setReport(i);
                      }}
                    >
                      <div className={`card-art art-${i}`}>
                        <div className="art-orbit" />
                        <div className="art-orbit second" />
                        <span className="art-number">0{i + 1}</span>
                        <span className="demo">DEMO</span>
                        <ArrowUpRight size={20} />
                      </div>
                      <div className="card-body">
                        <span className="category">
                          {m.category} <span> / {m.code}</span>
                        </span>
                        <h3>{m.title}</h3>
                        <p>{m.text}</p>
                        <div className="card-bottom">
                          <span>Illustrative research brief</span>
                          <ArrowRight size={15} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              <section className="manifesto">
                <span className="mini-core">
                  <Hexagon size={26} />
                </span>
                <div>
                  <h2>Intelligence is better together.</h2>
                  <p>
                    Discover. Challenge. Connect. A foundation for research with
                    evidence at its core.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("AI Agents")}
                >
                  Meet the agents <ArrowUpRight size={17} />
                </button>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">HIVECORE / WORKSPACE</div>
                  <h1>{page}</h1>
                  <p>
                    {
                      (
                        {
                          Colony:
                            "A connected view of the research architecture.",
                          "Research Missions":
                            "Frame a question. Give your next discovery a starting point.",
                          "AI Agents":
                            "Four complementary roles. One shared research direction.",
                          "Evidence Network":
                            "Trace the path from a source to a claim.",
                          "Intelligence Reports":
                            "Where connected findings become a clearer perspective.",
                          "Colony Activity":
                            "A transparent record of your local workspace.",
                        } as Record<string, string>
                      )[page]
                    }
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setFormError("");
                    setModal(true);
                  }}
                >
                  <Plus size={17} /> New mission
                </button>
              </div>
              <ResearchPanel view={page} data={research} />
              {page === "Colony" && (
                <>
                  <div className="demo-banner">
                    <span className="demo">DEMO</span> Interactive architecture
                    visualization. Simulated nodes do not represent live agent
                    activity.
                  </div>
                  <ColonyMap large />
                  <div className="workflow">
                    {[
                      "01 / Discover",
                      "02 / Verify",
                      "03 / Synthesize",
                      "04 / Review",
                    ].map((s, i) => (
                      <div key={s}>
                        <span>{s}</span>
                        <p>{agents[i].description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {page === "Research Missions" && (
                <>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search missions"
                        placeholder="Search your missions…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter by category"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {["All", ...categories].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {error ? (
                    <div className="empty-state">
                      <h2>Connect your local database</h2>
                      <p>{error}</p>
                      <button className="secondary" onClick={() => void load()}>
                        Retry connection
                      </button>
                    </div>
                  ) : loading ? (
                    <p role="status">Loading missions…</p>
                  ) : filtered.length ? (
                    <div className="mission-list">
                      {filtered.map((m) => (
                        <article className="saved-mission" key={m.id}>
                          <div className="mission-icon">
                            <ScanLine />
                          </div>
                          <div>
                            <span className="category">{m.category}</span>
                            <h3>{m.title}</h3>
                            <p>{m.objective}</p>
                            <small>
                              Created {new Date(m.created_at).toLocaleString()}{" "}
                              · Saved locally
                            </small>
                          </div>
                          <div className="mission-run-controls">
                            <span className="status">{m.status}</span>
                            {m.status === "draft" && (
                              <button
                                className="secondary"
                                disabled={!research?.enabled || !!starting}
                                title={
                                  research?.reason ||
                                  "Runs a real Cloudflare AI mission"
                                }
                                onClick={() => void startMission(m.id)}
                              >
                                {starting === m.id
                                  ? "Starting…"
                                  : "Start real research"}
                              </button>
                            )}
                            {m.error && <p className="error">{m.error}</p>}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ScanLine size={36} />
                      <h2>
                        {missions.length
                          ? "No matching missions"
                          : "Your next discovery starts with a question."}
                      </h2>
                      <p>
                        {missions.length
                          ? "Try another search or category."
                          : "Create a research draft. Save permitted source URLs, then start it after approval."}
                      </p>
                      {!missions.length && (
                        <button
                          className="primary"
                          onClick={() => setModal(true)}
                        >
                          Create your first mission <Plus size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              {page === "AI Agents" && (
                <>
                  <div className="demo-banner">
                    <span className="demo">DEMO</span> Agent profiles describe
                    the original demo architecture. Real Phase 2A roles appear
                    above.
                  </div>
                  <div className="agent-grid">
                    {agents.map((a, i) => (
                      <article className="agent-card" key={a.name}>
                        <div
                          className="agent-emblem"
                          style={{ color: a.color }}
                        >
                          <Radio size={30} />
                        </div>
                        <span className="category">ROLE / 0{i + 1}</span>
                        <h2>{a.name}</h2>
                        <h3>{a.role}</h3>
                        <p>{a.description}</p>
                        <span className="status">DEMO · Not running</span>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {page === "Evidence Network" && (
                <>
                  <div className="demo-banner">
                    <span className="demo">DEMO</span> Illustrative evidence
                    structure. These examples are not verified findings.
                  </div>
                  <div className="evidence-flow">
                    {[
                      "Source document",
                      "Extracted claim",
                      "Independent review",
                      "Report citation",
                    ].map((s, i) => (
                      <React.Fragment key={s}>
                        <div>
                          <span>0{i + 1}</span>
                          <Network size={26} />
                          <h3>{s}</h3>
                          <p>
                            {
                              [
                                "Preserve URL, title, and retrieval time.",
                                "Keep the original excerpt and its context.",
                                "Record support, disputes, and uncertainty.",
                                "Make every conclusion traceable.",
                              ][i]
                            }
                          </p>
                        </div>
                        {i < 3 && <ArrowRight className="flow-arrow" />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="empty-state">
                    <ShieldCheck size={32} />
                    <h2>Evidence starts with provenance.</h2>
                    <p>
                      Real retrieved sources and evidence appear above. This
                      diagram illustrates the workflow.
                    </p>
                  </div>
                </>
              )}
              {page === "Intelligence Reports" && (
                <>
                  <div className="demo-banner">
                    <span className="demo">DEMO</span> Editorial examples only.
                    These outlines are not real research. Completed real reports
                    appear above.
                  </div>
                  {report === null ? (
                    <div className="report-list">
                      {examples.map((r, i) => (
                        <button key={r.code} onClick={() => setReport(i)}>
                          <FileText size={25} />
                          <div>
                            <span className="category">
                              {r.code} / {r.category}
                            </span>
                            <h3>{r.title}</h3>
                            <p>Open illustrative research outline</p>
                          </div>
                          <ArrowUpRight />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <article className="report-detail">
                      <button
                        className="text-button"
                        onClick={() => setReport(null)}
                      >
                        ← All outlines
                      </button>
                      <span className="category">
                        DEMO RESEARCH OUTLINE / {examples[report].code}
                      </span>
                      <h2>{examples[report].title}</h2>
                      <p>{examples[report].text}</p>
                      <h3>Research question</h3>
                      <p>
                        Which developments matter most, what evidence supports
                        them, and what remains uncertain?
                      </p>
                      <h3>Proposed approach</h3>
                      <ol>
                        <li>Map the topic and identify primary sources.</li>
                        <li>Compare claims against independent evidence.</li>
                        <li>
                          Document limitations and competing explanations.
                        </li>
                        <li>Build a cited report for human review.</li>
                      </ol>
                      <h3>Evidence status</h3>
                      <p>
                        No sources collected. This is a demonstration outline,
                        not a completed report.
                      </p>
                    </article>
                  )}
                </>
              )}
              {page === "Colony Activity" && (
                <div className="activity-list">
                  <div className="activity-item">
                    <span className="signal" />
                    <div>
                      <h3>Phase 2A · Local workspace</h3>
                      <p>
                        Real research requires explicit approval. Actual events
                        appear above; saving a draft does not start AI.
                      </p>
                    </div>
                    <span className="status">LOCAL</span>
                  </div>
                  {error ? (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  ) : (
                    missions.map((m) => (
                      <div className="activity-item" key={m.id}>
                        <Plus size={18} />
                        <div>
                          <h3>Mission draft created</h3>
                          <p>{m.title}</p>
                        </div>
                        <time>{new Date(m.created_at).toLocaleString()}</time>
                      </div>
                    ))
                  )}
                  <div className="activity-item">
                    <Radio size={18} />
                    <div>
                      <h3>
                        Four agent roles prepared{" "}
                        <span className="demo">DEMO</span>
                      </h3>
                      <p>
                        Static demonstration profiles. No real agent events.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <footer>
            <span>
              HIVECORE <i>Collective Intelligence, Evolved.</i>
            </span>
            <span>
              <span className="signal" /> PHASE 2A <b>·</b> BUILT FOR WHAT’S
              NEXT
            </span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="mission-dialog-title"
        onCancel={(event) => {
          if (saving) event.preventDefault();
          if (!saving) setModal(false);
        }}
        onClose={() => setModal(false)}
      >
        <form ref={form} onSubmit={createMission}>
          <div className="dialog-heading">
            <div className="eyebrow">A NEW STARTING POINT</div>
            <button
              type="button"
              aria-label="Close mission form"
              disabled={saving}
              onClick={() => setModal(false)}
            >
              <X />
            </button>
          </div>
          <h2 id="mission-dialog-title">Create a research mission</h2>
          <p>
            Save a local draft. Start real research separately after live-test
            approval.
          </p>
          <label>
            Mission title
            <input
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="What would you like to understand?"
              autoFocus
            />
          </label>
          <label>
            Research objective
            <textarea
              name="objective"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="Describe the question, scope, and what a useful answer would include."
            />
          </label>
          <label>
            Research category
            <select name="category">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Source URLs (optional, one per line)
            <textarea
              name="sourceUrls"
              rows={3}
              maxLength={3000}
              placeholder="https://en.wikipedia.org/wiki/Energy_storage"
            />
            <small>
              Up to 3 English Wikipedia article URLs. With none, use an exact
              Wikipedia article title as the mission title; Explorer discovers
              related article links.
            </small>
          </label>
          {formError && (
            <p className="error" role="alert">
              {formError}
            </p>
          )}
          <div className="dialog-footer">
            <span>LOCAL D1 · NO AI CALLS</span>
            <button className="primary" disabled={saving}>
              {saving ? "Saving…" : "Save mission"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
