// Momentum Worker
// Proxies Notion API + stores daily history in Workers KV
//
// Endpoints:
//   POST /search        — search all shared pages/databases
//   GET  /databases     — list all shared databases
//   GET  /db/:id        — query a database
//   GET  /page/:id      — get a page + its children blocks
//   GET  /blocks/:id    — get block children
//   POST /history       — save a day snapshot { date, yP, mP, wP, dP, ... }
//   GET  /history       — get history for last N days (?days=90)
//   GET  /history/:date — get snapshot for a specific date (YYYY-MM-DD)

const NOTION = "https://api.notion.com/v1";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function notion(path, token, method, body) {
  const res = await fetch(NOTION + path, {
    method: method || "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch(e) { throw new Error("Notion non-JSON (status " + res.status + "): " + text.slice(0, 200)); }
}

// ─── History helpers (KV) ───────────────────────────────────────────────────

const HISTORY_KV_PREFIX = "history:";
const HISTORY_TTL = 60 * 60 * 24 * 400; // 400 days

async function kvSaveSnapshot(kv, date, snapshot) {
  const key = HISTORY_KV_PREFIX + date;
  await kv.put(key, JSON.stringify(snapshot), { expirationTtl: HISTORY_TTL });
}

async function kvGetSnapshot(kv, date) {
  const key = HISTORY_KV_PREFIX + date;
  const val = await kv.get(key);
  return val ? JSON.parse(val) : null;
}

async function kvGetHistory(kv, days) {
  const result = {};
  const today = new Date();
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  // Fetch in parallel
  await Promise.all(dates.map(async (date) => {
    const snap = await kvGetSnapshot(kv, date);
    if (snap) result[date] = snap;
  }));
  return result;
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── History API (no Notion token needed) ──

    if (path === "/history" && request.method === "POST") {
      if (!env.MOMENTUM_KV) return json({ error: "MOMENTUM_KV not configured" }, 500);
      const body = await request.json().catch(() => null);
      if (!body || !body.date) return json({ error: "Missing date field" }, 400);
      const { date, ...snapshot } = body;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Invalid date format, use YYYY-MM-DD" }, 400);
      await kvSaveSnapshot(env.MOMENTUM_KV, date, snapshot);
      return json({ ok: true, date });
    }

    if (path === "/history" && request.method === "GET") {
      if (!env.MOMENTUM_KV) return json({ error: "MOMENTUM_KV not configured" }, 500);
      const days = Math.min(parseInt(url.searchParams.get("days") || "90"), 365);
      const data = await kvGetHistory(env.MOMENTUM_KV, days);
      return json(data);
    }

    const histDateMatch = path.match(/^\/history\/(\d{4}-\d{2}-\d{2})$/);
    if (histDateMatch && request.method === "GET") {
      if (!env.MOMENTUM_KV) return json({ error: "MOMENTUM_KV not configured" }, 500);
      const snap = await kvGetSnapshot(env.MOMENTUM_KV, histDateMatch[1]);
      if (!snap) return json({ error: "Not found" }, 404);
      return json(snap);
    }

    // ── Notion proxy ──

    const token = env.NOTION_TOKEN;
    if (!token) {
      return json({ error: "NOTION_TOKEN not configured" }, 500);
    }

    try {
      if (path === "/search") {
        const body = request.method === "POST"
          ? await request.json().catch(() => ({}))
          : {};
        const data = await notion("/search", token, "POST", {
          query: body.query || "",
          page_size: body.page_size || 20,
          filter: body.filter || undefined,
          sort: body.sort || { direction: "descending", timestamp: "last_edited_time" },
        });
        return json(data);
      }

      if (path === "/databases") {
        const data = await notion("/search", token, "POST", {
          filter: { property: "object", value: "database" },
          page_size: 50,
        });
        return json(data);
      }

      const dbMatch = path.match(/^\/db\/([a-f0-9-]+)$/);
      if (dbMatch) {
        const body = request.method === "POST"
          ? await request.json().catch(() => ({}))
          : {};
        const data = await notion(
          "/databases/" + dbMatch[1] + "/query",
          token, "POST",
          { page_size: body.page_size || 50, filter: body.filter, sorts: body.sorts }
        );
        return json(data);
      }

      const pageMatch = path.match(/^\/page\/([a-f0-9-]+)$/);
      if (pageMatch) {
        const [page, blocks] = await Promise.all([
          notion("/pages/" + pageMatch[1], token),
          notion("/blocks/" + pageMatch[1] + "/children?page_size=100", token),
        ]);
        return json({ page, blocks: blocks.results || [] });
      }

      const blockMatch = path.match(/^\/blocks\/([a-f0-9-]+)$/);
      if (blockMatch) {
        const data = await notion("/blocks/" + blockMatch[1] + "/children?page_size=100", token);
        return json(data);
      }

      if (path === "/debug") {
        const hosts = ["https://api.notion.so", "https://api.notion.com"];
        const results = [];
        for (const host of hosts) {
          try {
            const r = await fetch(host + "/v1/users/me", {
              headers: { "Authorization": "Bearer " + token, "Notion-Version": "2022-06-28" },
            });
            const t = await r.text();
            results.push({ host, status: r.status, body: t.slice(0, 200) });
          } catch(e) {
            results.push({ host, error: e.message });
          }
        }
        return json({ results });
      }

      if (path === "/" || path === "/health") {
        const data = await notion("/search", token, "POST", { page_size: 1 });
        return json({
          status: "ok",
          has_results: !!(data.results && data.results.length),
          object: data.object,
        });
      }

      return json({
        error: "Not found",
        routes: ["/search", "/databases", "/db/:id", "/page/:id", "/blocks/:id", "/history", "/history/:date"],
      }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
