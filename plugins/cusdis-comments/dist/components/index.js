import { h } from "preact"

const defaultOptions = {
  host: "https://cusdis.com",
  appId: "",
  lang: "zh-cn",
}

function stripSlashes(s, onlyStripPrefix = false) {
  if (s.startsWith("/")) s = s.substring(1)
  if (!onlyStripPrefix && s.endsWith("/")) s = s.slice(0, -1)
  return s
}

function endsWith(s, suffix) {
  return s === suffix || s.endsWith("/" + suffix)
}

function trimSuffix(s, suffix) {
  if (endsWith(s, suffix)) s = s.slice(0, -suffix.length)
  return s
}

function simplifySlug(fp) {
  const res = stripSlashes(trimSuffix(fp ?? "", "index"), true)
  return res.length === 0 ? "/" : res
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

function pageTitle(fileData) {
  return fileData.frontmatter?.title ?? simplifySlug(fileData.slug ?? "").split("/").pop() ?? ""
}

function pageUrl(cfg, slug) {
  if (!cfg.baseUrl || !slug) return undefined
  return `https://${joinSegments(cfg.baseUrl, simplifySlug(slug))}`
}

const styleCss = `
.cusdis-comments {
  margin-top: 1.5rem;
}
`

const afterDomLoaded = `
window.CUSDIS_PREVENT_INITIAL_RENDER = true;
(function () {
  let scriptLoading = false;

  function loadScript(src, callback) {
    const existing = document.querySelector('script[data-cusdis-widget="true"]');
    if (window.CUSDIS) {
      callback();
      return;
    }
    if (existing || scriptLoading) {
      const wait = window.setInterval(function () {
        if (window.CUSDIS) {
          window.clearInterval(wait);
          callback();
        }
      }, 50);
      return;
    }

    scriptLoading = true;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.cusdisWidget = "true";
    script.onload = function () {
      scriptLoading = false;
      callback();
    };
    document.head.appendChild(script);
  }

  function loadLang(src) {
    if (!src || document.querySelector('script[data-cusdis-lang="true"]')) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.cusdisLang = "true";
    document.head.appendChild(script);
  }

  function renderCusdis() {
    const el = document.querySelector("#cusdis_thread");
    if (!el) return;

    const widgetSrc = el.dataset.scriptSrc;
    loadLang(el.dataset.langSrc);
    loadScript(widgetSrc, function () {
      if (window.CUSDIS && typeof window.CUSDIS.renderTo === "function") {
        window.CUSDIS.renderTo(el);
      } else if (typeof window.renderCusdis === "function") {
        window.renderCusdis(el);
      }
    });
  }

  document.addEventListener("nav", renderCusdis);
  document.addEventListener("render", renderCusdis);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCusdis);
  } else {
    renderCusdis();
  }
})();
`

const CusdisComments = (opts = {}) => {
  const options = { ...defaultOptions, ...opts }

  const Component = ({ displayClass, fileData, cfg }) => {
    const commentsOverride = fileData.frontmatter?.comments
    const appId = String(options.appId ?? "").trim()
    const host = String(options.host ?? defaultOptions.host).replace(/\/$/, "")

    if ((commentsOverride !== true && commentsOverride !== "true") || appId.length === 0) {
      return null
    }

    const slug = simplifySlug(fileData.slug ?? "")
    const cls = ["cusdis-comments", displayClass].filter(Boolean).join(" ")

    return h("div", {
      class: cls,
      id: "cusdis_thread",
      "data-host": host,
      "data-app-id": appId,
      "data-page-id": slug,
      "data-page-url": pageUrl(cfg, fileData.slug),
      "data-page-title": pageTitle(fileData),
      "data-script-src": `${host}/js/cusdis.es.js`,
      "data-lang-src": options.lang ? `${host}/js/widget/lang/${options.lang}.js` : undefined,
    })
  }

  Component.displayName = "CusdisComments"
  Component.css = styleCss
  Component.afterDOMLoaded = afterDomLoaded
  return Component
}

export { CusdisComments }
