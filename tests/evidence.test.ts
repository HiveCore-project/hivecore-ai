import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/mission-001.json";
import {
  validateFindings,
  validateReviews,
  validateReport,
  usageMetrics,
  WorkersAIProvider,
  type UsageRecord,
} from "../worker/ai";
import { claimFlags, reportWarnings } from "../worker/quality";
import { extractArticle } from "../worker/retrieval";
import { formatReport } from "../worker/research";
import { LIMITS, type Source } from "../shared/research";

const sources: Source[] = fixture.sources;
const source = sources[0];
const original = fixture.evidence.find((e) =>
  e.claim.includes("theoretical maximums"),
)!;
const badFinding = {
  sourceId: source.id,
  claim: original.claim,
  excerpt: original.excerpt,
};
const quote =
  "First-generation flywheel energy-storage systems use a large steel flywheel rotating on mechanical bearings.";
const finding = {
  sourceId: source.id,
  claim: "First-generation systems use steel flywheels on mechanical bearings.",
  excerpt: quote,
};
const link = { sourceId: source.id, relation: "supporting", excerpt: quote };
const review = {
  index: 0,
  verdict: "supported",
  reasoning:
    "The retained passage describes steel and mechanical bearings; one source only.",
  evidence: [link],
};
const report = {
  summary: finding.claim,
  summaryEvidenceIndexes: [0],
  findings: [{ text: finding.claim, evidenceIndexes: [0] }],
  uncertainty: [
    "Only a bounded Wikipedia excerpt was reviewed; independent research is needed.",
  ],
};

describe("Mission #001 offline regressions — no new research", () => {
  it("preserves the original source and immutable result files", () => {
    expect(createHash("sha256").update(source.excerpt).digest("hex")).toBe(
      source.content_hash,
    );
    for (const [file, hash] of [
      [
        "MISSION_001_TEST_REPORT.md",
        "e7027fac6194b35629601cab1bfb9cc8030979c0612f259b2680595dfcdf011f",
      ],
      [
        "mission-001-results.json",
        "8da9b215ccc7160a6800d4b3edb77f9c765f96bb68a66041aba3240d25657f3c",
      ],
    ])
      expect(
        createHash("sha256")
          .update(readFileSync(new URL("../docs/" + file, import.meta.url)))
          .digest("hex"),
      ).toBe(hash);
  });
  it("flags often-cited versus theoretical maxima and downgrades model agreement", () => {
    const findings = validateFindings({ findings: [badFinding] }, sources);
    expect(findings[0].flags?.join(" ")).toContain("theoretical");
    const [assessment] = validateReviews(
      {
        reviews: [
          { ...review, evidence: [{ ...link, excerpt: original.excerpt }] },
        ],
      },
      findings,
      sources,
    );
    expect(assessment.modelVerdict).toBe("supported");
    expect(assessment.verdict).toBe("partially_supported");
    expect(assessment.needsResearch).toBe(true);
    expect(() =>
      validateReport({ ...report, summary: original.claim }, findings, [
        assessment,
      ]),
    ).toThrow("quality");
  });
  it.each([
    ["efficiency", "as high as 90%"],
    ["lifespan", "lasting decades"],
    ["materials", "large steel flywheel rotating on mechanical bearings"],
  ])(
    "retains actual %s evidence and rejects the original false absence statement",
    (topic, expected) => {
      expect(source.excerpt).toContain(expected);
      const sentence =
        topic === "materials"
          ? "The text does not explain the specific mechanisms or materials used in non-advanced flywheel systems."
          : "The text does not provide data on the efficiency or lifespan of these systems.";
      expect(fixture.report).toContain(sentence);
      expect(() =>
        validateReport({ ...report, uncertainty: [sentence] }, [finding]),
      ).toThrow("absence assertion");
    },
  );
  it("accepts a corrected narrow, exactly cited material claim", () => {
    const findings = validateFindings({ findings: [finding] }, sources);
    const reviews = validateReviews({ reviews: [review] }, findings, sources);
    expect(validateReport(report, findings, reviews).summary).toBe(
      finding.claim,
    );
    expect(reviews[0].supportScope).toBe("single_source");
    expect(reviews[0].needsResearch).toBe(true);
  });
  it("does not equate multiple Wikipedia pages with independent corroboration", () => {
    const second = {
      ...source,
      id: "second",
      url: "https://en.wikipedia.org/wiki/Flywheel",
    };
    const [r] = validateReviews(
      {
        reviews: [
          { ...review, evidence: [link, { ...link, sourceId: second.id }] },
        ],
      },
      [finding],
      [...sources, second],
    );
    expect(r.supportScope).toBe("multiple_sources_not_independently_verified");
    expect(reportWarnings("AI agreement proves the claim.")).not.toHaveLength(
      0,
    );
    expect(reportWarnings("This is independently verified.")).not.toHaveLength(
      0,
    );
  });
});

describe("traceable evidence and conservative checks", () => {
  it.each(["supported", "contradicted", "partially_supported", "unverified"])(
    "handles %s without inventing support",
    (verdict) => {
      const relation =
        verdict === "contradicted"
          ? "opposing"
          : verdict === "unverified"
            ? "context"
            : "supporting";
      const [r] = validateReviews(
        {
          reviews: [{ ...review, verdict, evidence: [{ ...link, relation }] }],
        },
        [finding],
        sources,
      );
      expect(r.verdict).toBe(verdict);
      expect(source.excerpt.slice(r.evidence[0].start, r.evidence[0].end)).toBe(
        quote,
      );
    },
  );
  it("rejects missing, duplicate or foreign claim reviews", () => {
    expect(() =>
      validateReviews({ reviews: [review] }, [finding, finding], sources),
    ).toThrow("every finding");
    expect(() =>
      validateReviews(
        { reviews: [review, review] },
        [finding, finding],
        sources,
      ),
    ).toThrow("reference");
    expect(() =>
      validateReviews(
        { reviews: [{ ...review, index: 12 }] },
        [finding],
        sources,
      ),
    ).toThrow("reference");
  });
  it.each([
    { ...link, sourceId: "other-mission-source" },
    { ...link, excerpt: quote.replace("steel", "titanium") },
    { ...link, relation: "proof" },
  ])("rejects invented evidence edges %j", (edge) => {
    expect(() =>
      validateReviews(
        { reviews: [{ ...review, evidence: [edge] }] },
        [finding],
        sources,
      ),
    ).toThrow();
  });
  it("requires opposing evidence for contradiction and disallows conflicting supported verdict", () => {
    expect(() =>
      validateReviews(
        { reviews: [{ ...review, verdict: "contradicted" }] },
        [finding],
        sources,
      ),
    ).toThrow("relationships");
    expect(() =>
      validateReviews(
        {
          reviews: [
            { ...review, evidence: [link, { ...link, relation: "opposing" }] },
          ],
        },
        [finding],
        sources,
      ),
    ).toThrow("relationships");
  });
  it("checks numeric values and lost qualifiers without claiming unit equivalence", () => {
    const q = "The round-trip efficiency can be as high as 90%.";
    expect(claimFlags("Efficiency is 99%.", q).join(" ")).toContain(
      "Numerical",
    );
    expect(claimFlags("Efficiency is 90%.", q).join(" ")).toContain(
      "qualifier",
    );
    expect(claimFlags("Efficiency can be as high as 90%.", q)).toEqual([]);
    expect(
      claimFlags(
        "Specific energy is 40 kWh.",
        "Specific energy is 40 kJ/kg.",
      ).join(" "),
    ).toContain("Unit");
    expect(
      claimFlags(
        "Commercial systems have higher specific energy.",
        "Commercial systems have lower specific energy.",
      ).join(" "),
    ).toContain("reversed");
    expect(
      reportWarnings(
        "The claim is not independently verified. AI agreement is not proof.",
      ),
    ).toEqual([]);
  });
  it("validates summary references as well as finding references", () => {
    expect(() =>
      validateReport({ ...report, summaryEvidenceIndexes: [99] }, [finding]),
    ).toThrow("citation");
    expect(() =>
      validateReport({ ...report, summaryEvidenceIndexes: [] }, [finding]),
    ).toThrow();
    expect(() =>
      validateReport(
        {
          ...report,
          findings: [{ text: finding.claim, evidenceIndexes: [-1] }],
        },
        [finding],
      ),
    ).toThrow("citation");
  });
  it("requires uncertain claims to remain qualified in synthesis", () => {
    const reviews = validateReviews(
      {
        reviews: [
          {
            ...review,
            verdict: "unverified",
            evidence: [{ ...link, relation: "context" }],
          },
        ],
      },
      [finding],
      sources,
    );
    expect(() => validateReport(report, [finding], reviews)).toThrow("qualify");
  });
  it("renders opposing source URLs and timestamps alongside the claim", () => {
    const other = {
      ...source,
      id: "opposition",
      url: "https://en.wikipedia.org/wiki/Flywheel",
      title: "Other source",
    };
    const reviews = validateReviews(
      {
        reviews: [
          {
            ...review,
            verdict: "partially_supported",
            evidence: [
              link,
              { ...link, sourceId: other.id, relation: "opposing" },
            ],
          },
        ],
      },
      [finding],
      [...sources, other],
    );
    const body = formatReport(
      report,
      [finding],
      reviews,
      [...sources, other],
      "2026-10-12T00:00:00Z",
    );
    expect(body).toContain("[1] [2] (partially_supported");
    expect(body).toContain("opposing:");
    expect(body).toContain(other.url);
    expect(body).toContain(source.retrieved_at);
  });
  it("bounds extraction on a complete sentence where possible", () => {
    const sentence =
      "A retained scientific sentence with enough characters to exercise the source extraction boundary. ";
    const text = extractArticle(
      "<body><p>" + sentence.repeat(100) + "</p></body>",
    ).text;
    expect(text.length).toBeLessThanOrEqual(LIMITS.sourceChars);
    expect(text.endsWith(".")).toBe(true);
  });
});

describe("actual usage, never estimates", () => {
  it("retains zero and leaves absent/invalid metrics unknown", () => {
    expect(usageMetrics({ prompt_tokens: 0, completion_tokens: 20 })).toEqual({
      prompt_tokens: 0,
      completion_tokens: 20,
      total_tokens: null,
    });
    expect(
      usageMetrics({
        prompt_tokens: "42",
        completion_tokens: -1,
        total_tokens: Infinity,
      }),
    ).toEqual(usageMetrics(null));
  });
  it.each(["stop", "length"])(
    "records provided usage even for completion %s",
    async (finish) => {
      const records: UsageRecord[] = [];
      const ai = {
        run: vi.fn(async () => ({
          usage: {
            prompt_tokens: 230,
            completion_tokens: 40,
            total_tokens: 270,
          },
          choices: [{ finish_reason: finish, message: { content: "{}" } }],
        })),
      };
      const provider = new WorkersAIProvider(
        ai as unknown as Ai,
        async () => {},
        async (u) => {
          records.push(u);
        },
      );
      const result = provider.run("EXPLORER", {}, new AbortController().signal);
      if (finish === "stop") await expect(result).resolves.toEqual({});
      else await expect(result).rejects.toThrow("incomplete");
      expect(records.at(-1)?.total_tokens).toBe(270);
      expect(records.at(-1)?.status).toBe(
        finish === "stop" ? "returned" : "failed",
      );
      expect(ai.run).toHaveBeenCalledOnce();
    },
  );
  it("records failure with unknown consumption and never retries", async () => {
    const records: UsageRecord[] = [];
    const ai = {
      run: vi.fn(async () => {
        throw Error("quota");
      }),
    };
    await expect(
      new WorkersAIProvider(
        ai as unknown as Ai,
        async () => {},
        async (u) => {
          records.push(u);
        },
      ).run("EXPLORER", {}, new AbortController().signal),
    ).rejects.toThrow("No automatic retry");
    expect(records.at(-1)).toMatchObject({
      status: "failed",
      total_tokens: null,
    });
    expect(ai.run).toHaveBeenCalledOnce();
  });
});
