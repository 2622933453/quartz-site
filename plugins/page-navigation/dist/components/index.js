import { h } from "preact"

// ---- path helpers (inlined from @quartz-community/utils to keep this plugin self-contained) ----
function endsWith(s, suffix) {
  return s === suffix || s.endsWith("/" + suffix)
}
function trimSuffix(s, suffix) {
  if (endsWith(s, suffix)) s = s.slice(0, -suffix.length)
  return s
}
function stripSlashes(s, onlyStripPrefix) {
  if (s.startsWith("/")) s = s.substring(1)
  if (!onlyStripPrefix && s.endsWith("/")) s = s.slice(0, -1)
  return s
}
function simplifySlug(fp) {
  const res = stripSlashes(trimSuffix(fp ?? "", "index"), true)
  return res.length === 0 ? "/" : res
}
function pathToRoot(slug) {
  let rootPath = slug
    .split("/")
    .filter((x) => x !== "")
    .slice(0, -1)
    .map(() => "..")
    .join("/")
  if (rootPath.length === 0) rootPath = "."
  return rootPath
}
function joinSegments(...args) {
  if (args.length === 0) return ""
  let joined = args
    .filter((segment) => segment !== "" && segment !== "/")
    .map((segment) => stripSlashes(segment))
    .join("/")
  const first = args[0]
  const last = args[args.length - 1]
  if (first?.startsWith("/")) joined = "/" + joined
  if (last?.endsWith("/")) joined = joined + "/"
  return joined
}
function resolveRelative(current, target) {
  return joinSegments(pathToRoot(current), simplifySlug(target))
}

// ---- article helpers ----
function folderOf(slug) {
  const parts = simplifySlug(slug).split("/")
  parts.pop()
  return parts.join("/")
}
function titleOf(file) {
  return file.frontmatter?.title ?? simplifySlug(file.slug ?? "").split("/").pop() ?? "Untitled"
}
// Sort key: prefer an ISO date (YYYY-MM-DD) parsed from the filename (diary entries),
// fall back to the page's created/modified/published date.
function sortKey(file) {
  const seg = simplifySlug(file.slug ?? "").split("/").pop() ?? ""
  const m = seg.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
    if (!Number.isNaN(t)) return t
  }
  const d = file.dates && (file.dates.created ?? file.dates.modified ?? file.dates.published)
  if (d) {
    const t = new Date(d).getTime()
    if (!Number.isNaN(t)) return t
  }
  return 0
}

const styleCss = `
.page-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}
.page-nav-link {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 0;
  min-width: 0;
  max-width: 48%;
  padding: 0.7rem 1rem;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  text-decoration: none;
  background: var(--light);
  transition: border-color 0.15s ease, transform 0.15s ease;
}
a.page-nav-link:hover {
  border-color: var(--secondary);
  transform: translateY(-2px);
}
.page-nav-next {
  text-align: right;
  align-items: flex-end;
}
.page-nav-label {
  font-size: 0.8rem;
  color: var(--gray);
}
.page-nav-title {
  font-weight: 600;
  color: var(--secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.page-nav-empty {
  visibility: hidden;
  pointer-events: none;
  border: none;
  background: none;
}
`

const defaultOptions = {
  prevLabel: "上一篇",
  nextLabel: "下一篇",
}

const PageNavigation = (opts) => {
  const options = { ...defaultOptions, ...opts }

  const Component = ({ fileData, allFiles, displayClass }) => {
    const currentSlug = fileData.slug
    if (!currentSlug) return null

    const currentSimple = simplifySlug(currentSlug)
    const folder = folderOf(currentSlug)

    // Candidates: published pages in the same folder that aren't folder indexes.
    const candidates = allFiles.filter((f) => {
      if (!f.slug) return false
      if (f.unlisted === true) return false
      if (endsWith(f.slug, "index")) return false
      if (simplifySlug(f.slug) === "/") return false
      return folderOf(f.slug) === folder
    })

    // The current page must be part of the navigable set.
    if (!candidates.some((f) => simplifySlug(f.slug) === currentSimple)) return null

    // Newest first (descending by date). Going down the list = older = 下一篇.
    candidates.sort((a, b) => {
      const d = sortKey(b) - sortKey(a)
      if (d !== 0) return d
      return simplifySlug(b.slug).localeCompare(simplifySlug(a.slug))
    })

    const idx = candidates.findIndex((f) => simplifySlug(f.slug) === currentSimple)
    if (idx === -1) return null

    const newer = idx > 0 ? candidates[idx - 1] : null // 上一篇 (更新的一篇)
    const older = idx < candidates.length - 1 ? candidates[idx + 1] : null // 下一篇 (更早的一篇)

    if (!newer && !older) return null

    const renderLink = (file, label, dir) =>
      h(
        "a",
        {
          class: `page-nav-link page-nav-${dir}`,
          href: resolveRelative(currentSlug, file.slug),
        },
        h("span", { class: "page-nav-label" }, label),
        h("span", { class: "page-nav-title" }, titleOf(file)),
      )

    const cls = ["page-navigation", displayClass].filter(Boolean).join(" ")

    return h(
      "nav",
      { class: cls, "aria-label": "文章导航" },
      newer
        ? renderLink(newer, options.prevLabel, "prev")
        : h("span", { class: "page-nav-link page-nav-empty" }),
      older
        ? renderLink(older, options.nextLabel, "next")
        : h("span", { class: "page-nav-link page-nav-empty" }),
    )
  }

  Component.displayName = "PageNavigation"
  Component.css = styleCss
  return Component
}

export { PageNavigation }
