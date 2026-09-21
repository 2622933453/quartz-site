export const dashboardHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>来访记录 · Ghiaccio的手账</title>
<style>
:root{color-scheme:light;--ink:#343d38;--muted:#727b74;--paper:#f6f4ec;--line:#dddfd3;--accent:#306954}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.65 system-ui,sans-serif}
main{max-width:1180px;margin:64px auto;padding:0 28px}header{display:flex;justify-content:space-between;align-items:center;gap:24px}
.eyebrow{font-size:12px;letter-spacing:.16em;color:var(--accent)}h1{font-size:32px;letter-spacing:.05em;margin:8px 0}p{color:var(--muted)}
.card{margin-top:28px;padding:28px;border:1px solid var(--line);border-radius:16px;background:#fffef9}
#login{max-width:520px}label{display:block;font-weight:600;margin-bottom:10px}input{width:100%;font:inherit;padding:12px;border:1px solid #bcc6bc;border-radius:8px;background:white}
button{font:inherit;cursor:pointer;border:1px solid var(--accent);border-radius:8px;padding:9px 18px;background:var(--accent);color:white}button:disabled{opacity:.5;cursor:default}.secondary{background:transparent;color:var(--accent)}
#login button{margin-top:18px}#status{min-height:24px;color:#925432}#summary{display:flex;gap:48px}.number{font-size:34px;font-weight:600;display:block}.caption{color:var(--muted);font-size:13px}
.toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin:30px 0 16px}.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{font-size:12px;letter-spacing:.05em;color:var(--muted);font-weight:500}td,th{padding:15px 12px;border-bottom:1px solid var(--line)}td:first-child,th:first-child{padding-left:0}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}td:last-child{max-width:370px;overflow:hidden;text-overflow:ellipsis}.ip{font:13px ui-monospace,monospace}.foot{font-size:12px;margin-top:22px}#empty{padding:38px 0;text-align:center}#more{display:block;margin:22px auto}[hidden]{display:none!important}
@media(max-width:640px){main{margin:28px auto;padding:0 18px}.card{padding:20px}h1{font-size:26px}#summary{gap:30px}.number{font-size:28px}}
</style><script src="/dashboard.js" defer></script></head>
<body><main><header><div><div class="eyebrow">GHIACCIO / PRIVATE</div><h1>来访记录</h1><p>看看哪些文章被读过，读者来自哪里。</p></div><button id="logout" class="secondary" hidden>退出</button></header>
<form id="login" class="card"><label for="token">管理密钥</label><input id="token" type="password" required minlength="32" maxlength="256" autocomplete="current-password" placeholder="输入你的管理密钥"><button type="submit">查看记录</button><p class="foot">密钥仅保存在当前页面内存中，刷新或退出后需重新输入。</p></form>
<p id="status" role="status" aria-live="polite"></p>
<section id="records" hidden><nav class="toolbar" aria-label="记录来源"><div><button id="live" aria-pressed="true">近期访问</button> <button id="umami" class="secondary" aria-pressed="false">Umami 历史</button></div></nav><div class="card" id="summary"><div><span class="caption" id="period">最近 30 天 · 页面访问</span><span class="number" id="views">—</span></div><div><span class="caption" id="identity-label">不同 IP 数</span><span class="number" id="ips">—</span></div></div>
<div class="toolbar"><span class="caption">最新访问在前 · 时间为北京时间</span><button id="refresh" class="secondary">刷新</button></div>
<div class="scroll"><table><thead><tr><th>访问时间</th><th>公网 IP</th><th>大致位置</th><th>浏览文章</th></tr></thead><tbody id="rows"></tbody></table></div>
<p id="empty" hidden>还没有来访记录。接通网站后，新的访问会出现在这里。</p><button id="more" class="secondary" hidden>加载更早记录</button>
<p class="foot" id="footnote"></p><p class="foot">不同 IP 数不等于人数。位置为 IP 推测结果，可能是运营商或 VPN 出口所在地。启用隐私保护、拦截脚本或网络失败的访问可能不会记录。</p></section>
</main></body></html>`

// Keep browser code as text: the Worker bundler adds helpers to function.toString().
export const dashboardScript = String.raw`(() => {
  const el = (id) => document.getElementById(id)
  let token = ""
  let cursor = null
  let generation = 0
  let source = "live"
  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const countries = new Intl.DisplayNames(["zh-CN"], { type: "region" })
  const status = (text) => {
    el("status").textContent = text
  }
  const lock = () => {
    generation++
    token = ""
    cursor = null
    el("token").value = ""
    el("rows").replaceChildren()
    el("views").textContent = "—"
    el("ips").textContent = "—"
    el("records").hidden = true
    el("logout").hidden = true
    el("login").hidden = false
  }
  async function load(append = false) {
    const current = ++generation
    for (const button of document.querySelectorAll("button:not(#logout)")) button.disabled = true
    status("正在读取…")
    try {
      const response = await fetch("/api/visits?source=" + source + (append && cursor ? "&before=" + encodeURIComponent(cursor) : ""), {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
      })
      const data = await response.json()
      if (current !== generation) return
      if (!response.ok) {
        if (response.status === 401) lock()
        throw new Error(data.error || "读取失败，请稍后再试。")
      }
      el("login").hidden = true
      el("records").hidden = false
      el("logout").hidden = false
      el("token").value = ""
      if (!append) el("rows").replaceChildren()
      for (const row of data.rows) {
        const tr = document.createElement("tr")
        let country = row.country
        try {
          if (country) country = countries.of(country)
        } catch {
          /* Unknown region code. */
        }
        const values = [
          date.format(new Date(row.visited_at)),
          row.ip || "未记录",
          [...new Set([country, row.region, row.city].filter(Boolean))].join(" / ") || "未知位置",
        ]
        for (const [index, value] of values.entries()) {
          const td = document.createElement("td")
          td.textContent = value
          if (index === 1) td.className = "ip"
          tr.append(td)
        }
        const page = document.createElement("td")
        const link = document.createElement("a")
        const target = new URL(row.path, row.origin)
        if (target.protocol === "https:" && target.origin === row.origin) {
          link.href = target.href
          link.target = "_blank"
          link.rel = "noopener noreferrer"
        }
        try {
          link.textContent = decodeURIComponent(row.path)
        } catch {
          link.textContent = row.path
        }
        if (row.path === "/") link.textContent = "首页"
        page.append(link)
        tr.append(page)
        el("rows").append(tr)
      }
      cursor = data.nextCursor
      el("more").hidden = cursor === null
      el("empty").hidden = el("rows").children.length > 0
      el("views").textContent = data.summary.views.toLocaleString()
      const historical = data.source === "umami"
      el("ips").textContent = (historical ? data.summary.sessions : data.summary.ips).toLocaleString()
      el("identity-label").textContent = historical ? "Umami 会话数" : "不同 IP 数"
      el("period").textContent = historical ? "已导入历史 · 页面访问" : "最近 " + data.retentionDays + " 天 · 页面访问"
      el("empty").textContent = historical ? "还没有导入 Umami 历史记录。" : "还没有来访记录。接通网站后，新的访问会出现在这里。"
      el("footnote").textContent = historical
        ? "Umami 不保存原始 IP。历史数据单独保留，不受 30 天清理规则影响；会话数不等于人数。" + (data.summary.firstAt ? " 数据范围：" + date.format(new Date(data.summary.firstAt)) + " 至 " + date.format(new Date(data.summary.lastAt)) + "。" : "")
        : "仅展示最近 " + data.retentionDays + " 天的记录，过期数据每天自动清理。"
      for (const name of ["live", "umami"]) {
        el(name).className = name === source ? "" : "secondary"
        el(name).setAttribute("aria-pressed", String(name === source))
      }
      status("")
    } catch (error) {
      if (current === generation || !token) status(error.message || "连接失败，请稍后重试。")
    } finally {
      for (const button of document.querySelectorAll("button")) button.disabled = false
    }
  }
  el("login").addEventListener("submit", (event) => {
    event.preventDefault()
    token = el("token").value.trim()
    load()
  })
  el("refresh").addEventListener("click", () => load())
  el("more").addEventListener("click", () => load(true))
  for (const name of ["live", "umami"]) el(name).addEventListener("click", () => {
    if (source === name) return
    source = name
    cursor = null
    load()
  })
  el("logout").addEventListener("click", () => {
    lock()
    status("已退出。")
    el("token").focus()
  })
  window.addEventListener("pagehide", lock)
})();`
