import { h } from "preact"
import { installTracker } from "./tracker.js"

export const VisitorLog = (options = {}) => {
  const endpoint = (process.env.VISITOR_LOG_ENDPOINT ?? options.endpoint ?? "").trim()
  if (endpoint && new URL(endpoint).protocol !== "https:")
    throw new Error("Visitor log endpoint must use HTTPS")
  const Component = () =>
    endpoint
      ? h(
          "details",
          { class: "visitor-log-notice" },
          h("summary", null, "访问统计说明"),
          h(
            "p",
            null,
            "本站记录访问时间、页面路径、公网 IP 与推测地区，用于了解文章访问情况。记录仅站主可见，保留 30 天并定期清理，不记录文章正文、网址参数或精确定位。支持浏览器的“请勿跟踪”和全局隐私控制设置。",
          ),
        )
      : null
  Component.displayName = "VisitorLog"
  Component.css =
    ".visitor-log-notice{margin:2rem 0 1rem;color:var(--gray);font-size:.8rem}.visitor-log-notice summary{cursor:pointer}.visitor-log-notice p{line-height:1.7;color:var(--gray)}"
  if (endpoint)
    Component.afterDOMLoaded = `(${installTracker.toString()})(${JSON.stringify(endpoint)}, ["https://xh-diary.me", "https://www.xh-diary.me"]);`
  return Component
}
