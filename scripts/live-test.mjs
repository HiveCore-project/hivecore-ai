// Never included in npm test. This script is intentionally inert without opt-in.
import assert from "node:assert/strict";
import missionInput from "./live-mission.json" with { type: "json" };
if (process.env.HIVECORE_LIVE_TEST !== "I_APPROVE_ONE_REAL_MISSION") {
  console.error(
    "Not run. Obtain explicit approval first, confirm Workers Free, then follow docs/PHASE_2A.md.",
  );
  process.exit(1);
}
const base = "http://127.0.0.1:8787";
const state = await (await fetch(`${base}/api/research`)).json();
assert.equal(state.enabled, true, state.reason);
const response = await fetch(`${base}/api/missions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(missionInput),
});
assert.equal(response.status, 201);
const { mission } = await response.json();
console.log(
  `Starting exactly one approved real mission: ${mission.id}. No retries.`,
);
const run = await fetch(`${base}/api/missions/${mission.id}/start`, {
  method: "POST",
  headers: { "X-Hivecore-Live": "approved" },
  signal: AbortSignal.timeout(240000),
});
const result = await run.json();
assert.equal(run.status, 200, result.error || result.mission?.error);
assert.equal(result.mission.status, "completed");
const completed = await (await fetch(`${base}/api/research`)).json();
assert.ok(completed.reports.some((report) => report.mission_id === mission.id));
assert.equal(completed.enabled, false, "One-use approval should be consumed.");
console.log(
  "One live mission completed. Read its report and inspect citations in the dashboard. Approval is consumed.",
);
