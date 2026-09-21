import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { parseArgs } from "node:util"
import { insertSql, normalize, readRows } from "./umami-data.mjs"

const { values } = parseArgs({
  options: {
    events: { type: "string" },
    sessions: { type: "string" },
    website: { type: "string" },
    origin: { type: "string", default: "https://xh-diary.me" },
    apply: { type: "boolean", default: false },
  },
})
if (!values.events || !values.website) {
  console.error(
    "Usage: node scripts/import-umami.mjs --events <CSV/CSV.gz/JSON> --sessions <optional CSV/CSV.gz/JSON> --website <website-id> [--origin https://xh-diary.me] [--apply]",
  )
  process.exit(1)
}
const root = fileURLToPath(new URL("../", import.meta.url))
const result = normalize(
  readRows(resolve(values.events)),
  values.sessions ? readRows(resolve(values.sessions)) : [],
  values.website,
  values.origin,
)
const output = resolve(root, ".imports")
mkdirSync(output, { recursive: true })
const report = {
  ...result.counts,
  websiteId: values.website,
  origin: values.origin,
  firstAt: result.rows.length ? new Date(result.rows[0].visitedAt).toISOString() : null,
  lastAt: result.rows.length ? new Date(result.rows.at(-1).visitedAt).toISOString() : null,
  timestampAssumption: "Timestamps without timezone are interpreted as UTC",
}
writeFileSync(resolve(output, "last-report.json"), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (!values.apply) {
  console.log("Validation only. No remote data changed. Add --apply to import the validated data.")
  process.exit(0)
}
if (!result.rows.length) throw new Error("No page views to import")
const importedAt = Date.now()
for (let offset = 0; offset < result.rows.length; offset += 250) {
  const file = resolve(output, "batch.sql")
  writeFileSync(file, insertSql(result.rows.slice(offset, offset + 250), importedAt))
  const run = spawnSync(
    process.execPath,
    [
      resolve(root, "node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "execute",
      "DB",
      "--remote",
      "--file",
      file,
    ],
    { cwd: root, encoding: "utf8" },
  )
  if (run.status !== 0) {
    // Wrangler errors can contain SQL and visitor data; retain details locally, not in public logs.
    writeFileSync(resolve(output, "last-error.txt"), run.stdout + run.stderr)
    throw new Error(
      "Import failed. See .imports/last-error.txt. Rerunning safely skips imported events.",
    )
  }
  console.log(
    `Processed ${Math.min(offset + 250, result.rows.length)} / ${result.rows.length} page views`,
  )
}
console.log("Import complete. Duplicate event IDs were ignored by the database.")
