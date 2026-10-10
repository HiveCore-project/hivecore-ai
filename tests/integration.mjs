import assert from "node:assert/strict";
const base = "http://127.0.0.1:8787";
const post = (body, headers = {}) =>
  fetch(`${base}/api/missions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const title = `Integration draft ${Date.now()}`;
const response = await post({
  title,
  objective: "Verify local D1 persistence through the real Worker API.",
  category: "Technology",
  status: "running",
});
assert.equal(response.status, 201);
const { mission } = await response.json();
assert.equal(mission.status, "draft");
const list = await (await fetch(`${base}/api/missions`)).json();
assert.ok(list.missions.some((m) => m.id === mission.id && m.title === title));
assert.equal((await post({ title: "x" })).status, 400);
assert.equal((await post("{")).status, 400);
assert.equal((await post("x".repeat(12001))).status, 413);
assert.equal(
  (
    await post({
      title: "Unsafe source",
      objective: "This must never fetch a private URL.",
      category: "Technology",
      sourceUrls: ["http://127.0.0.1/secret"],
    })
  ).status,
  400,
);
const research = await (await fetch(`${base}/api/research`)).json();
assert.equal(
  research.enabled,
  false,
  "Integration checks require the default locked server.",
);
assert.equal(
  (
    await fetch(`${base}/api/missions/${mission.id}/start`, {
      method: "POST",
      headers: { "X-Hivecore-Live": "approved" },
    })
  ).status,
  403,
);
const unchanged = await (await fetch(`${base}/api/research`)).json();
assert.equal(
  unchanged.usedToday,
  research.usedToday,
  "Rejected starts must not consume quota.",
);
assert.equal(
  (await post({}, { Origin: "https://untrusted.example" })).status,
  403,
);
assert.equal(
  (await fetch(`${base}/api/missions`, { method: "DELETE" })).status,
  405,
);
assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
console.log(
  `Integration checks passed. Local test draft retained: ${mission.id}`,
);
