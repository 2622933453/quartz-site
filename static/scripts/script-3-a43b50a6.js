(function installTracker(endpoint, allowedOrigins) {
  if (window.__privateVisitorLog || !allowedOrigins.includes(location.origin)) return
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return
  window.__privateVisitorLog = true
  let lastPath = null
  let timer
  function track() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const path = location.pathname
      if (path === lastPath || document.visibilityState === "hidden") return
      lastPath = path
      const body = JSON.stringify({ id: crypto.randomUUID(), path })
      // No cookies, persistent visitor ID, title, query string, or fragment.
      fetch(endpoint, {
        method: "POST",
        body,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        credentials: "omit",
        keepalive: true,
        referrerPolicy: "no-referrer",
      }).catch(() => {
        /* Statistics must never interrupt reading. */
      })
    }, 0)
  }
  document.addEventListener("nav", track)
  document.addEventListener("visibilitychange", track)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      lastPath = null
      track()
    }
  })
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", track, { once: true })
  else track()
})("https://visits.xh-diary.me/collect", ["https://xh-diary.me", "https://www.xh-diary.me"]);