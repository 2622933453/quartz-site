import test from "node:test"
import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { normalize, insertSql, readRows, timestamp } from "../scripts/umami-data.mjs"

const websiteId = "ea473a69-2b12-46a5-af9f-a5d4b6858fdb"
const origin = "https://xh-diary.me"
const base = {
  website_id: websiteId,
  event_type: "1",
  event_id: "event-one",
  session_id: "session-one",
  created_at: "2026-06-01 12:34:56.123",
  url_path: "/文章?private=value#fragment",
}

test("imports page views with linked geography, never fabricating an IP", () => {
  const { rows, counts } = normalize(
    [base, base, { ...base, event_type: "2" }, { ...base, website_id: "unrelated-site" }],
    [
      {
        session_id: "session-one",
        website_id: websiteId,
        country: "CN",
        subdivision1: "CN-SH",
        city: "Shanghai",
        ip: "must-not-import",
      },
    ],
    websiteId,
    origin,
  )
  assert.deepEqual(counts, {
    input: 4,
    pageviews: 1,
    customEvents: 1,
    otherWebsites: 1,
    duplicates: 1,
    missingLocation: 0,
  })
  assert.equal(rows[0].visitedAt, Date.parse("2026-06-01T12:34:56.123Z"))
  assert.equal(rows[0].path, "/文章")
  assert.equal(rows[0].city, "Shanghai")
  assert.equal("ip" in rows[0], false)
})

test("SQL import is idempotent and safely quotes arbitrary article paths", () => {
  const db = new DatabaseSync(":memory:")
  try {
    db.exec(readFileSync(new URL("../migrations/0002_umami_history.sql", import.meta.url), "utf8"))
    const path = "/it's-a-note'); DROP TABLE umami_visits; --"
    const { rows } = normalize([{ ...base, url_path: path }], [], websiteId, origin)
    db.exec(insertSql(rows))
    db.exec(insertSql(rows))
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM umami_visits").get().n, 1)
    assert.equal(db.prepare("SELECT path FROM umami_visits").get().path, path)
  } finally {
    db.close()
  }
})

test("reads gzip CSV with quoted commas and BOM", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "umami-import-"))
  const file = join(dir, "events.csv.gz")
  t.after(() => {
    unlinkSync(file)
    rmdirSync(dir)
  })
  writeFileSync(
    file,
    gzipSync("\uFEFFwebsite_id,event_id,url_path\r\n" + websiteId + ',one,"/a,b"\r\n'),
  )
  assert.equal(readRows(file)[0].url_path, "/a,b")
})

test("rejects invalid dates, absent site attribution, and external URLs", () => {
  for (const value of ["", "bad", "1960-01-01", "999999999999999999"])
    assert.throws(() => timestamp(value))
  assert.equal(timestamp("1780317296123"), Date.parse("2026-06-01T12:34:56.123Z"))
  assert.throws(() => normalize([{ ...base, website_id: "" }], [], websiteId, origin))
  assert.throws(() => normalize([{ ...base, event_type: "" }], [], websiteId, origin))
  assert.throws(() => normalize([{ ...base, url_path: "//evil.example" }], [], websiteId, origin))
})
