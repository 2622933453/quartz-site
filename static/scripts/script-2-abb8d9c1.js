
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
      window.setTimeout(function () {
        customizeCusdisFrame(el);
      }, 100);
    });
  }

  function customizeCusdisFrame(el) {
    const iframe = el.querySelector("iframe");
    if (!iframe) return;

    iframe.style.minHeight = "680px";
    iframe.style.overflow = "visible";
    iframe.setAttribute("scrolling", "no");

    try {
      const doc = iframe.contentDocument;
      if (!doc || doc.getElementById("cusdis-quartz-overrides")) return;

      const style = doc.createElement("style");
      style.id = "cusdis-quartz-overrides";
      style.textContent = [
        'input[type="email"],',
        'input[name="email"],',
        'input[placeholder*="邮箱"],',
        'input[placeholder*="Email"],',
        'div:has(> input[type="email"]),',
        'div:has(> input[name="email"]),',
        'label:has(input[type="email"]),',
        'label:has(input[name="email"]),',
        '.field:has(input[type="email"]),',
        '.field:has(input[name="email"]),',
        '.form-control:has(input[type="email"]),',
        '.form-control:has(input[name="email"]) {',
        '  display: none !important;',
        '}',
        'html, body, #root {',
        '  min-height: 640px !important;',
        '  overflow: visible !important;',
        '}',
        '.grid-cols-2 {',
        '  grid-template-columns: minmax(0, 1fr) !important;',
        '}',
        'textarea[name="reply_content"] {',
        '  min-height: 10rem !important;',
        '  resize: vertical !important;',
        '}',
      ].join("\n");
      doc.head.appendChild(style);
    } catch (_) {
    }
  }

  document.addEventListener("nav", renderCusdis);
  document.addEventListener("render", renderCusdis);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCusdis);
  } else {
    renderCusdis();
  }
})();
