export const MODEL = "@cf/zai-org/glm-4.7-flash" as const;
export const LIMITS = {
  missionsPerDay: 3,
  sources: 3,
  calls: 3,
  outputTokens: 1200,
  sourceChars: 4500,
  inputBytes: 28000,
  pageBytes: 750000,
  fetchMs: 12000,
  aiMs: 45000,
  missionMs: 210000,
} as const;
export interface Source {
  id: string;
  mission_id: string;
  url: string;
  title: string;
  excerpt: string;
  retrieved_at: string;
  content_hash: string;
}
export interface Finding {
  sourceId: string;
  claim: string;
  excerpt: string;
  flags?: string[];
}
export interface EvidenceLink {
  sourceId: string;
  relation: "supporting" | "opposing" | "context";
  excerpt: string;
  start: number;
  end: number;
}
export interface Review {
  index: number;
  verdict: "unverified" | "supported" | "contradicted" | "partially_supported";
  reasoning: string;
  modelVerdict: Review["verdict"];
  flags: string[];
  evidence: EvidenceLink[];
  supportScope:
    | "single_source"
    | "multiple_sources_not_independently_verified"
    | "no_support";
  needsResearch: boolean;
}
export interface ReportBody {
  summary: string;
  summaryEvidenceIndexes: number[];
  findings: { text: string; evidenceIndexes: number[] }[];
  uncertainty: string[];
}
export interface ResearchSnapshot {
  enabled: boolean;
  reason: string;
  model: string;
  usedToday: number;
  remainingToday: number;
  sources: Source[];
  evidence: {
    id: string;
    mission_id: string;
    source_id: string;
    claim: string;
    excerpt: string;
    verdict: string;
    reasoning: string;
    assessment_version?: string | null;
    model_verdict?: string | null;
    flags?: string | null;
    support_scope?: string | null;
    needs_research?: number | null;
  }[];
  links: (EvidenceLink & { evidence_id: string })[];
  usage: {
    mission_id: string;
    ai_calls: number;
    role: string | null;
    status: string | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
  }[];
  reports: {
    id: string;
    mission_id: string;
    title: string;
    body: string;
    created_at: string;
  }[];
  activity: {
    id: string;
    mission_id: string;
    agent: string;
    message: string;
    created_at: string;
  }[];
}
// Exact host and article-path allowlist: no arbitrary DNS names or IPs are fetched.
export function permittedUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Provide a valid Wikipedia article URL.");
  }
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    throw new Error("Invalid URL encoding.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "en.wikipedia.org" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    !path.startsWith("/wiki/") ||
    path.length <= 6 ||
    /[:%\\\x00-\x20]/.test(path) ||
    raw.length > 1000
  )
    throw new Error(
      "Only HTTPS en.wikipedia.org/wiki/Article URLs are permitted; no namespaces, queries, credentials, ports or private hosts.",
    );
  url.hash = "";
  return url.href;
}
export function validateSourceUrls(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > LIMITS.sources ||
    value.some((v) => typeof v !== "string")
  )
    throw new Error("Provide at most three permitted source URLs.");
  return [...new Set(value.map(permittedUrl))];
}
