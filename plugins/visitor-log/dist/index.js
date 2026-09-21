import { installTracker } from "./tracker.js"

export const VisitorLog = (options = {}) => {
  const endpoint = (process.env.VISITOR_LOG_ENDPOINT ?? options.endpoint ?? "").trim()
  if (endpoint && new URL(endpoint).protocol !== "https:")
    throw new Error("Visitor log endpoint must use HTTPS")
  const Component = () => null
  Component.displayName = "VisitorLog"
  if (endpoint)
    Component.afterDOMLoaded = `(${installTracker.toString()})(${JSON.stringify(endpoint)}, ["https://xh-diary.me", "https://www.xh-diary.me"]);`
  return Component
}
