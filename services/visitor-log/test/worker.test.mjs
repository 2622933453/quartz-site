import test from "node:test"
import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { readFileSync } from "node:fs"
import worker from "../src/index.js"

const origin = "https://xh-diary.me"
const key = "test-only-management-key-32-characters-long"
function setup(t) {
  const db = new DatabaseSync(":memory:")
  t.after(() => db.close())
  db.exec(readFileSync(new URL("../migrations/0001_visits.sql", import.meta.url), "utf8"))
  const env = {
    ALLOWED_ORIGINS: origin,
    ADMIN_TOKEN: key,
    RETENTION_DAYS: "30",
    COLLECT_LIMITER: { limit: async () => ({ success: true }) },
    ADMIN_LIMITER: { limit: async () => ({ success: true }) },
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run: async () => db.prepare(sql).run(...args),
              all: async () => ({ results: db.prepare(sql).all(...args) }),
            }
          },
        }
      },
      batch: async (statements) => Promise.all(statements.map((s) => s.all())),
    },
  }
  return { db, env }
}
function event(body = {}, headers = {}) {
  const request = new Request("https://visits.example/collect", {
    method: "POST",
    headers: { Origin: origin, "CF-Connecting-IP": "203.0.113.5", ...headers },
    body: JSON.stringify({ id: crypto.randomUUID(), path: "/diary/hello", ...body }),
  })
  request.cf = { country: "CN", region: "Shanghai", city: "Shanghai" }
  return request
}
function admin(token = key, query = "") {
  return new Request("https://visits.example/api/visits" + query, {
    headers: { Authorization: "Bearer " + token },
  })
}

test("records trusted edge IP/geography and deduplicates event retries", async (t) => {
  const { env, db } = setup(t)
  const body = { id: crypto.randomUUID(), ip: "forged", country: "forged" }
  assert.equal((await worker.fetch(event(body), env)).status, 204)
  assert.equal((await worker.fetch(event(body), env)).status, 204)
  const rows = db.prepare("SELECT * FROM visits").all()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].ip, "203.0.113.5")
  assert.equal(rows[0].city, "Shanghai")
  assert.equal(rows[0].path, "/diary/hello")
})

test("private API rejects absent/wrong/unconfigured credentials; responses are not cached", async (t) => {
  const { env } = setup(t)
  for (const token of ["", "wrong", key.slice(1), "x".repeat(300)]) {
    const response = await worker.fetch(admin(token), env)
    assert.equal(response.status, 401)
    assert.equal(response.headers.get("Cache-Control"), "no-store")
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null)
    assert.equal((await response.text()).includes("203.0.113"), false)
  }
  assert.equal((await worker.fetch(admin(), { ...env, ADMIN_TOKEN: "" })).status, 503)
  const page = await worker.fetch(new Request("https://visits.example/admin"), env)
  assert.equal((await page.text()).includes(key), false)
})

test("collect validates origin, path, UUID, IP and payload limit", async (t) => {
  const { env, db } = setup(t)
  for (const badOrigin of ["https://evil.example", "null", ""]) {
    assert.equal((await worker.fetch(event({}, { Origin: badOrigin }), env)).status, 403)
  }
  for (const path of [
    "//evil.example",
    "https://evil.example",
    "/secret?password=abc",
    "/a#secret",
    "/\\evil",
    "/bad\npath",
    "x".repeat(4100),
  ]) {
    assert.equal((await worker.fetch(event({ path }), env)).status, 400)
  }
  assert.equal((await worker.fetch(event({ id: "invalid" }), env)).status, 400)
  assert.equal((await worker.fetch(event({}, { "CF-Connecting-IP": "" }), env)).status, 400)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM visits").get().count, 0)
  const preflight = await worker.fetch(
    new Request("https://visits.example/collect", {
      method: "OPTIONS",
      headers: { Origin: origin },
    }),
    env,
  )
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin)
})

test("privacy headers and rate limits prevent insertion", async (t) => {
  const { env, db } = setup(t)
  assert.equal((await worker.fetch(event({}, { "Sec-GPC": "1" }), env)).status, 204)
  assert.equal((await worker.fetch(event({}, { DNT: "1" }), env)).status, 204)
  env.COLLECT_LIMITER.limit = async () => ({ success: false })
  assert.equal((await worker.fetch(event(), env)).status, 429)
  env.ADMIN_LIMITER.limit = async () => ({ success: false })
  assert.equal((await worker.fetch(admin(), env)).status, 429)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM visits").get().count, 0)
})

test("pagination, summary and retention operate on actual SQLite records", async (t) => {
  const { env, db } = setup(t)
  for (let i = 0; i < 105; i++) await worker.fetch(event({ path: "/article/" + i }), env)
  const first = await (await worker.fetch(admin(), env)).json()
  assert.equal(first.rows.length, 100)
  assert.equal(first.rows[0].path, "/article/104")
  assert.deepEqual(first.summary, { views: 105, ips: 1 })
  const second = await (await worker.fetch(admin(key, "?before=" + first.nextCursor), env)).json()
  assert.equal(second.rows.length, 5)
  assert.equal(second.nextCursor, null)
  assert.equal(new Set([...first.rows, ...second.rows].map((r) => r.id)).size, 105)
  assert.equal((await worker.fetch(admin(key, "?before=bad"), env)).status, 400)
  db.prepare("UPDATE visits SET visited_at = ? WHERE id = 1").run(Date.now() - 31 * 86400000)
  assert.equal((await (await worker.fetch(admin(), env)).json()).summary.views, 104)
  await worker.scheduled({}, env)
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM visits").get().count, 104)
})

test("storage failures are reported without disclosing internals or pretending to save", async (t) => {
  const { env } = setup(t)
  env.DB.prepare = () => {
    throw new Error("sensitive SQL details")
  }
  const response = await worker.fetch(event(), env)
  assert.equal(response.status, 503)
  assert.equal((await response.text()).includes("sensitive"), false)
})
