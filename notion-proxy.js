// Notion API proxy — runs locally, no Cloudflare issues
// Usage: NOTION_TOKEN=ntn_xxx node notion-proxy.js

const http = require("http");
const TOKEN = process.env.NOTION_TOKEN;
const NOTION = "https://api.notion.so/v1";
const PORT = 8787;

if (!TOKEN) { console.error("Set NOTION_TOKEN env var"); process.exit(1); }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function notion(path, method, body) {
  const res = await fetch(NOTION + path, {
    method: method || "GET",
    headers: {
      Authorization: "Bearer " + TOKEN,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function send(res, data, status) {
  res.writeHead(status || 200, CORS);
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  try {
    if (path === "/search") {
      const body = req.method === "POST" ? await readBody(req) : {};
      const data = await notion("/search", "POST", {
        query: body.query || "",
        page_size: body.page_size || 20,
        filter: body.filter || undefined,
        sort: body.sort || { direction: "descending", timestamp: "last_edited_time" },
      });
      return send(res, data);
    }

    if (path === "/databases") {
      const data = await notion("/search", "POST", {
        filter: { property: "object", value: "database" },
        page_size: 50,
      });
      return send(res, data);
    }

    const dbMatch = path.match(/^\/db\/([a-f0-9-]+)$/);
    if (dbMatch) {
      const body = req.method === "POST" ? await readBody(req) : {};
      const data = await notion("/databases/" + dbMatch[1] + "/query", "POST", {
        page_size: body.page_size || 50,
        filter: body.filter,
        sorts: body.sorts,
      });
      return send(res, data);
    }

    const pageMatch = path.match(/^\/page\/([a-f0-9-]+)$/);
    if (pageMatch) {
      const [page, blocks] = await Promise.all([
        notion("/pages/" + pageMatch[1]),
        notion("/blocks/" + pageMatch[1] + "/children?page_size=100"),
      ]);
      return send(res, { page, blocks: blocks.results || [] });
    }

    const blockMatch = path.match(/^\/blocks\/([a-f0-9-]+)$/);
    if (blockMatch) {
      const data = await notion("/blocks/" + blockMatch[1] + "/children?page_size=100");
      return send(res, data);
    }

    if (path === "/" || path === "/health") {
      const data = await notion("/search", "POST", { page_size: 1 });
      return send(res, {
        status: data.object === "list" ? "ok" : "error",
        results_count: data.results ? data.results.length : 0,
        object: data.object,
      });
    }

    send(res, { error: "Not found" }, 404);
  } catch (err) {
    send(res, { error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log("Notion proxy running on http://localhost:" + PORT);
});
