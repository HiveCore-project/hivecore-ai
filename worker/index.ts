import { validateMission, type Mission } from "../shared/mission";
import { MODEL, LIMITS, validateSourceUrls } from "../shared/research";
import {
  liveGate,
  expireInterrupted,
  reserveMission,
  runResearch,
  type ResearchEnv,
} from "./research";
import { boundedText } from "./retrieval";
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export default {
  async fetch(request: Request, env: ResearchEnv): Promise<Response> {
    const url = new URL(request.url);
    if (
      env.APP_MODE !== "local" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      return json({ error: "Local development only." }, 403);
    const origin = request.headers.get("Origin");
    if (
      origin &&
      ![
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8787",
        "http://127.0.0.1:8787",
      ].includes(origin)
    )
      return json({ error: "Origin not allowed." }, 403);
    const path = url.pathname;
    if (path === "/api/health" && request.method === "GET")
      return json({ mode: "local", aiEnabled: !liveGate(env) });
    try {
      if (
        request.method === "GET" &&
        ["/api/missions", "/api/research"].includes(path)
      )
        await expireInterrupted(env.DB);
      if (path === "/api/research" && request.method === "GET") {
        let reason = liveGate(env);
        const usage = await env.DB.prepare(
          "SELECT count(*) AS used FROM mission_runs WHERE day=strftime('%Y-%m-%d','now')",
        ).first<{ used: number }>();
        if (
          !reason &&
          (await env.DB.prepare(
            "SELECT id FROM mission_runs WHERE approval_id=?",
          )
            .bind(env.LIVE_APPROVAL_ID!)
            .first())
        )
          reason =
            "This one-use approval has already been consumed. Another live run needs a new explicit approval.";
        if (!reason && (usage?.used || 0) >= LIMITS.missionsPerDay)
          reason = "Global daily limit reached. Resets at 00:00 UTC.";
        if (
          !reason &&
          (await env.DB.prepare(
            "SELECT id FROM missions WHERE status='running'",
          ).first())
        )
          reason = "Another research mission is running.";
        const results = await env.DB.batch([
          env.DB.prepare(
            "SELECT * FROM sources WHERE is_demo=0 ORDER BY retrieved_at DESC LIMIT 90",
          ),
          env.DB.prepare(
            "SELECT * FROM evidence WHERE is_demo=0 ORDER BY rowid DESC LIMIT 150",
          ),
          env.DB.prepare(
            "SELECT * FROM reports WHERE is_demo=0 ORDER BY created_at DESC LIMIT 30",
          ),
          env.DB.prepare(
            "SELECT * FROM agent_activity ORDER BY created_at DESC,rowid DESC LIMIT 150",
          ),
        ]);
        return json({
          enabled: !reason,
          reason,
          model: MODEL,
          usedToday: usage?.used || 0,
          remainingToday: Math.max(0, 3 - (usage?.used || 0)),
          sources: results[0].results,
          evidence: results[1].results,
          reports: results[2].results,
          activity: results[3].results,
        });
      }
      const start = path.match(/^\/api\/missions\/([a-f0-9-]{36})\/start$/);
      if (start && request.method === "POST") {
        const reason = liveGate(env);
        if (reason) return json({ error: reason }, 403);
        if (request.headers.get("X-Hivecore-Live") !== "approved")
          return json(
            { error: "Explicit live-start acknowledgement is required." },
            400,
          );
        await expireInterrupted(env.DB);
        const mission = await env.DB.prepare(
          "SELECT * FROM missions WHERE id=? AND user_id=?",
        )
          .bind(start[1], "local-user")
          .first<Mission>();
        if (!mission) return json({ error: "Mission not found." }, 404);
        if (mission.status !== "draft")
          return json(
            {
              error:
                "Only an unstarted draft can run. Runs are never automatically retried.",
            },
            409,
          );
        let runId: string;
        try {
          runId = await reserveMission(env, mission.id);
        } catch {
          return json(
            {
              error:
                "Start rejected: approval consumed, daily limit reached, or another mission is running.",
            },
            409,
          );
        }
        await runResearch(env, mission, runId);
        const current = await env.DB.prepare(
          "SELECT * FROM missions WHERE id=?",
        )
          .bind(mission.id)
          .first<Mission>();
        return json(
          { mission: current },
          current?.status === "completed" ? 200 : 502,
        );
      }
      if (path !== "/api/missions") return json({ error: "Not found." }, 404);
      if (request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM missions WHERE user_id=? ORDER BY created_at DESC",
        )
          .bind("local-user")
          .all();
        return json({ missions: results });
      }
      if (request.method === "POST") {
        if (!request.headers.get("Content-Type")?.includes("application/json"))
          return json({ error: "JSON is required." }, 415);
        let raw: string;
        try {
          raw = await boundedText(new Response(request.body), 12000);
        } catch {
          return json({ error: "Request missing or too large." }, 413);
        }
        let input;
        let urls;
        try {
          const value = JSON.parse(raw);
          input = validateMission(value);
          urls = validateSourceUrls(value.sourceUrls);
        } catch (error) {
          return json(
            {
              error:
                error instanceof SyntaxError
                  ? "Invalid JSON."
                  : (error as Error).message,
            },
            400,
          );
        }
        const mission: Mission = {
          id: crypto.randomUUID(),
          ...input,
          status: "draft",
          created_at: new Date().toISOString(),
          source_urls: JSON.stringify(urls),
        };
        await env.DB.prepare(
          "INSERT INTO missions(id,user_id,title,objective,category,status,created_at,source_urls) VALUES(?,?,?,?,?,?,?,?)",
        )
          .bind(
            mission.id,
            "local-user",
            mission.title,
            mission.objective,
            mission.category,
            mission.status,
            mission.created_at,
            mission.source_urls!,
          )
          .run();
        return json({ mission }, 201);
      }
      return json({ error: "Method not allowed." }, 405);
    } catch {
      return json(
        {
          error:
            "Local database unavailable. Run npm run db:migrate and retry. A started run may need time to expire; never retry AI automatically.",
        },
        503,
      );
    }
  },
};
