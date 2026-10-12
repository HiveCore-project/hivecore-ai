// Read-only locked-server checks: no drafts, starts, inference or quota consumption.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const base = "http://127.0.0.1:8787";
async function get(path) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  return response.json();
}
assert.equal(
  (await get("/api/health")).aiEnabled,
  false,
  "Use the normal locked server.",
);
const before = await get("/api/missions");
const research = await get("/api/research");
assert.equal(research.enabled, false);
for (const key of [
  "sources",
  "evidence",
  "reports",
  "activity",
  "links",
  "usage",
])
  assert.ok(Array.isArray(research[key]), key);
for (const source of research.sources)
  assert.equal(
    createHash("sha256").update(source.excerpt).digest("hex"),
    source.content_hash,
  );
for (const link of research.links) {
  const source = research.sources.find((s) => s.id === link.sourceId);
  if (source)
    assert.equal(source.excerpt.slice(link.start, link.end), link.excerpt);
}
const original = JSON.parse(
  readFileSync(
    new URL("../docs/mission-001-results.json", import.meta.url),
    "utf8",
  ).replace(/^\uFEFF/, ""),
);
for (const report of original.reports) {
  const stored = research.reports.find((r) => r.id === report.id);
  if (stored) assert.equal(stored.body, report.body);
}
for (const evidence of original.evidence) {
  const stored = research.evidence.find((e) => e.id === evidence.id);
  if (stored)
    for (const key of ["claim", "excerpt", "verdict", "reasoning"])
      assert.equal(stored[key], evidence[key]);
}
assert.equal(
  (
    await fetch(base + "/api/missions", {
      headers: { Origin: "https://untrusted.example" },
    })
  ).status,
  403,
);
assert.equal((await fetch(base + "/api/unknown")).status, 404);
assert.deepEqual((await get("/api/missions")).missions, before.missions);
assert.equal((await get("/api/research")).usedToday, research.usedToday);
console.log(
  "Read-only integration passed: locked API, schema, provenance, historical records and origin guard; no missions created or started.",
);
