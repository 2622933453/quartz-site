import { dashboardHtml, dashboardScript } from "./dashboard.js"

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}

function reply(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...securityHeaders, ...headers } })
}

function json(body, status = 200) {
  return reply(JSON.stringify(body), status, { "Content-Type": "application/json; charset=utf-8" })
}

function cutoff(env) {
  const days = Number(env.RETENTION_DAYS ?? 30)
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error("Invalid retention")
  return Date.now() - days * 86400000
}

async function authorized(request, env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) return false
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? ""
  if (token.length > 256) return false
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all(
    [token, env.ADMIN_TOKEN].map(
      async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))),
    ),
  )
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i]
  return difference === 0
}

async function limited(limiter, key) {
  // Missing bindings are a deployment error: never silently disable protection.
  if (!limiter) throw new Error("Missing rate limiter")
  return !(await limiter.limit({ key })).success
}

async function readSmallJson(request) {
  if (Number(request.headers.get("Content-Length")) > 4096) throw new Error("Too large")
  const reader = request.body?.getReader()
  if (!reader) throw new Error("Missing body")
  let length = 0
  const chunks = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.length
    if (length > 4096) {
      await reader.cancel()
      throw new Error("Too large")
    }
    chunks.push(value)
  }
  const buffer = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }
  return JSON.parse(new TextDecoder().decode(buffer))
}

async function collect(request, env) {
  const origin = request.headers.get("Origin")
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!origin || !allowed.includes(origin)) return reply("Forbidden", 403)
  const cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
  if (request.method === "OPTIONS")
    return reply(null, 204, {
      ...cors,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
    })
  if (request.method !== "POST")
    return reply("Method not allowed", 405, { ...cors, Allow: "POST, OPTIONS" })
  // This header is supplied by Cloudflare, never by the submitted JSON or X-Forwarded-For.
  const ip = request.headers.get("CF-Connecting-IP")
  if (!ip || ip.length > 64) return reply("Missing client IP", 400, cors)
  if (await limited(env.COLLECT_LIMITER, ip)) return reply("Too many requests", 429, cors)
  if (request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1")
    return reply(null, 204, cors)
  let event
  try {
    event = await readSmallJson(request)
  } catch {
    return reply("Invalid event", 400, cors)
  }
  if (
    !event ||
    typeof event.path !== "string" ||
    event.path.length > 2048 ||
    !event.path.startsWith("/") ||
    event.path.startsWith("//") ||
    /[?#\\\x00-\x1f]/.test(event.path) ||
    typeof event.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.id)
  ) {
    return reply("Invalid event", 400, cors)
  }
  const cf = request.cf ?? {}
  const field = (value) => (typeof value === "string" ? value.slice(0, 120) : "")
  await env.DB.prepare(
    `INSERT OR IGNORE INTO visits
    (event_id, visited_at, origin, path, ip, country, region, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      event.id,
      Date.now(),
      origin,
      event.path,
      ip,
      field(cf.country),
      field(cf.region),
      field(cf.city),
    )
    .run()
  return reply(null, 204, cors)
}

async function visits(request, env, url) {
  if (request.method !== "GET") return reply("Method not allowed", 405, { Allow: "GET" })
  if (await limited(env.ADMIN_LIMITER, request.headers.get("CF-Connecting-IP") ?? "unknown")) {
    return json({ error: "请求太频繁，请一分钟后再试。" }, 429)
  }
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32)
    return json({ error: "后台尚未配置管理密钥。" }, 503)
  if (!(await authorized(request, env))) return json({ error: "管理密钥不正确。" }, 401)
  const rawCursor = url.searchParams.get("before")
  const before = rawCursor === null ? Number.MAX_SAFE_INTEGER : Number(rawCursor)
  if (!Number.isSafeInteger(before) || before <= 0) return json({ error: "无效的分页参数。" }, 400)
  const since = cutoff(env)
  const results = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, visited_at, origin, path, ip, country, region, city FROM visits
      WHERE visited_at >= ? AND id < ? ORDER BY id DESC LIMIT 101`,
    ).bind(since, before),
    env.DB.prepare(
      "SELECT COUNT(*) AS views, COUNT(DISTINCT ip) AS ips FROM visits WHERE visited_at >= ?",
    ).bind(since),
  ])
  const rows = results[0].results.slice(0, 100)
  return json({
    rows,
    nextCursor: results[0].results.length > 100 ? rows.at(-1).id : null,
    summary: results[1].results[0],
    retentionDays: Number(env.RETENTION_DAYS ?? 30),
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    try {
      if (url.pathname === "/collect") return await collect(request, env)
      if (url.pathname === "/api/visits") return await visits(request, env, url)
      if (request.method === "GET" && ["/", "/admin"].includes(url.pathname)) {
        return reply(dashboardHtml, 200, { "Content-Type": "text/html; charset=utf-8" })
      }
      if (request.method === "GET" && url.pathname === "/dashboard.js") {
        return reply(dashboardScript, 200, { "Content-Type": "text/javascript; charset=utf-8" })
      }
      return reply("Not found", 404)
    } catch {
      // Do not send database errors or visitor information to public responses/logs.
      return json({ error: "服务暂不可用，请稍后重试。" }, 503)
    }
  },
  async scheduled(_event, env) {
    await env.DB.prepare("DELETE FROM visits WHERE visited_at < ?").bind(cutoff(env)).run()
  },
}
