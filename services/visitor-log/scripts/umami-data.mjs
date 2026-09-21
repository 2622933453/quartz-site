import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { parse } from "csv-parse/sync"

const pick = (row, ...keys) => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== "\\N") return String(value)
  }
  return ""
}

export function readRows(file) {
  let data = readFileSync(file)
  if (data[0] === 0x1f && data[1] === 0x8b)
    data = gunzipSync(data, { maxOutputLength: 128 * 1024 * 1024 })
  const text = data.toString("utf8").replace(/^\uFEFF/, "")
  if (text.trimStart().startsWith("[")) {
    const rows = JSON.parse(text)
    if (!Array.isArray(rows)) throw new Error("Expected an array of events")
    return rows
  }
  return parse(text, { columns: true, bom: true, skip_empty_lines: true })
}

export function timestamp(value) {
  if (!value) throw new Error("Missing event timestamp")
  let time
  if (/^\d+(\.\d+)?$/.test(value)) {
    const n = Number(value)
    time = n < 1e11 ? n * 1000 : n
  } else {
    // Database exports use UTC; avoid interpreting timezone-less timestamps in local time.
    let date = value.trim().replace(" ", "T")
    if (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/.test(date)) date += "Z"
    time = Date.parse(date)
  }
  if (!Number.isFinite(time) || time < Date.UTC(2000, 0, 1) || time > Date.now() + 86400000) {
    throw new Error("Invalid or future event timestamp")
  }
  return Math.floor(time)
}

export function normalize(events, sessions, websiteId, origin) {
  const base = new URL(origin)
  if (base.protocol !== "https:" || base.origin !== origin)
    throw new Error("Origin must be a bare HTTPS origin")
  if (!/^[\da-f-]{36}$/i.test(websiteId)) throw new Error("Invalid website ID")
  const sessionMap = new Map()
  for (const session of sessions) {
    const website = pick(session, "website_id", "websiteId")
    if (website && website !== websiteId) continue
    const id = pick(session, "session_id", "sessionId", "id")
    if (id) sessionMap.set(id, session)
  }
  const rows = []
  const seen = new Set()
  const counts = {
    input: events.length,
    pageviews: 0,
    customEvents: 0,
    otherWebsites: 0,
    duplicates: 0,
    missingLocation: 0,
  }
  for (const [index, event] of events.entries()) {
    const website = pick(event, "website_id", "websiteId")
    // Full Cloud export rows must identify the site: never silently import an unrelated file.
    if (!website) throw new Error(`Row ${index + 1}: missing website_id`)
    if (website !== websiteId) {
      counts.otherWebsites++
      continue
    }
    const type = pick(event, "event_type", "eventType")
    if (!type) throw new Error(`Row ${index + 1}: missing event_type`)
    if (type !== "1") {
      counts.customEvents++
      continue
    }
    const eventId = pick(event, "event_id", "eventId", "id")
    if (!eventId || eventId.length > 256)
      throw new Error(`Row ${index + 1}: missing or invalid event_id`)
    if (seen.has(eventId)) {
      counts.duplicates++
      continue
    }
    seen.add(eventId)
    const sessionId = pick(event, "session_id", "sessionId")
    const location = sessionMap.get(sessionId) ?? event
    const pathValue = pick(event, "url_path", "urlPath", "path")
    if (
      !pathValue.startsWith("/") ||
      pathValue.startsWith("//") ||
      /[\\\x00-\x1f]/.test(pathValue)
    ) {
      throw new Error(`Row ${index + 1}: invalid page path`)
    }
    // The private log intentionally excludes URL queries/fragments, including imported data.
    const path = pathValue.split(/[?#]/, 1)[0]
    if (path.length > 2048) throw new Error(`Row ${index + 1}: page path too long`)
    const country = pick(location, "country").slice(0, 120)
    if (!country) counts.missingLocation++
    rows.push({
      websiteId,
      eventId,
      sessionId,
      origin,
      path,
      visitedAt: timestamp(pick(event, "created_at", "createdAt", "visited_at")),
      country,
      region: pick(location, "subdivision1", "region").slice(0, 120),
      city: pick(location, "city").slice(0, 120),
    })
  }
  rows.sort((a, b) => a.visitedAt - b.visitedAt || a.eventId.localeCompare(b.eventId))
  counts.pageviews = rows.length
  return { rows, counts }
}

export function insertSql(rows, importedAt = Date.now()) {
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'"
  return rows
    .map(
      (row) => `INSERT OR IGNORE INTO umami_visits
    (website_id,event_id,session_id,visited_at,origin,path,country,region,city,imported_at)
    VALUES (${[
      row.websiteId,
      row.eventId,
      row.sessionId,
      row.visitedAt,
      row.origin,
      row.path,
      row.country,
      row.region,
      row.city,
      importedAt,
    ]
      .map(quote)
      .join(",")});`,
    )
    .join("\n")
}
