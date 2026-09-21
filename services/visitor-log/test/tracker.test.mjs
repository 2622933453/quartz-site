import test from "node:test"
import assert from "node:assert/strict"
import vm from "node:vm"
import { installTracker } from "../../../plugins/visitor-log/dist/tracker.js"

function browser(options = {}) {
  const events = new Map()
  const pending = new Map()
  const calls = []
  let sequence = 0
  const context = {
    window: { addEventListener: (name, handler) => events.set(name, handler) },
    document: {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: (name, handler) => events.set(name, handler),
    },
    navigator: options.navigator ?? {},
    location: {
      origin: options.origin ?? "https://xh-diary.me",
      pathname: "/",
      search: "?private=abc",
      hash: "#secret",
    },
    crypto: { randomUUID: () => crypto.randomUUID() },
    fetch: async (...args) => {
      calls.push(args)
    },
    setTimeout: (callback) => {
      pending.set(++sequence, callback)
      return sequence
    },
    clearTimeout: (id) => pending.delete(id),
  }
  vm.createContext(context)
  const run = () =>
    vm.runInContext(
      `(${installTracker.toString()})("https://visits.example/collect", ["https://xh-diary.me"])`,
      context,
    )
  const flush = () => {
    for (const [id, callback] of pending) {
      pending.delete(id)
      callback()
    }
  }
  run()
  return { context, events, calls, flush, run }
}

test("initial load and SPA navigation record exactly once without URL secrets", () => {
  const b = browser()
  b.events.get("nav")()
  b.flush()
  assert.equal(b.calls.length, 1)
  assert.deepEqual(Object.keys(JSON.parse(b.calls[0][1].body)).sort(), ["id", "path"])
  assert.equal(JSON.parse(b.calls[0][1].body).path, "/")
  b.events.get("nav")()
  b.flush()
  assert.equal(b.calls.length, 1)
  b.context.location.pathname = "/diary/article"
  b.events.get("nav")()
  b.flush()
  assert.equal(b.calls.length, 2)
  b.context.location.pathname = "/"
  b.events.get("nav")()
  b.flush()
  assert.equal(b.calls.length, 3)
  b.run()
  b.flush()
  assert.equal(b.calls.length, 3)
  b.events.get("pageshow")({ persisted: true })
  b.flush()
  assert.equal(b.calls.length, 4)
})

test("local previews, privacy settings and background tabs do not send visits", () => {
  for (const options of [
    { origin: "http://localhost:8080" },
    { navigator: { doNotTrack: "1" } },
    { navigator: { globalPrivacyControl: true } },
  ]) {
    const b = browser(options)
    b.flush()
    assert.equal(b.calls.length, 0)
  }
  const b = browser()
  b.context.document.visibilityState = "hidden"
  b.flush()
  assert.equal(b.calls.length, 0)
  b.context.document.visibilityState = "visible"
  b.events.get("visibilitychange")()
  b.flush()
  assert.equal(b.calls.length, 1)
})
