
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
      [100, 500, 1200].forEach(function (delay) {
        window.setTimeout(function () {
          customizeCusdisFrame(el);
        }, delay);
      });
    });
  }

  function customizeCusdisFrame(el) {
    const iframe = el.querySelector("iframe");
    if (!iframe) return;

    iframe.style.minHeight = "760px";
    iframe.style.overflow = "hidden";
    iframe.setAttribute("scrolling", "no");

    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      if (!doc.getElementById("cusdis-quartz-overrides")) {
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
          'html, body {',
          '  height: auto !important;',
          '  min-height: 0 !important;',
          '  overflow: hidden !important;',
          '  scrollbar-width: none !important;',
          '}',
          'html::-webkit-scrollbar, body::-webkit-scrollbar {',
          '  display: none !important;',
          '}',
          '#root {',
          '  min-height: 0 !important;',
          '  overflow: visible !important;',
          '}',
          '.grid-cols-2 {',
          '  grid-template-columns: minmax(0, 1fr) !important;',
          '}',
          'textarea[name="reply_content"] {',
          '  min-height: 10rem !important;',
          '  resize: vertical !important;',
          '}',
          'a[href="https://cusdis.com"],',
          'a[href="https://cusdis.com/"],',
          'div:has(> a[href="https://cusdis.com"]),',
          'div:has(> a[href="https://cusdis.com/"]) {',
          '  display: none !important;',
          '}',
        ].join("\n");
        doc.head.appendChild(style);
      }

      syncCusdisFrameHeight(el, iframe);
      if (!doc.documentElement.dataset.quartzAutoHeight) {
        doc.documentElement.dataset.quartzAutoHeight = "true";
        iframe.addEventListener("load", function () {
          window.setTimeout(function () {
            customizeCusdisFrame(el);
          }, 100);
        });
        const root = doc.getElementById("root") || doc.body;
        if (root) {
          const observer = new MutationObserver(function () {
            syncCusdisFrameHeight(el, iframe);
          });
          observer.observe(root, { childList: true, subtree: true, attributes: true });
        }
      }
    } catch (_) {
    }
  }

  function syncCusdisFrameHeight(el, iframe) {
    try {
      const doc = iframe.contentDocument;
      const height = Math.max(
        760,
        doc.documentElement.scrollHeight,
        doc.body ? doc.body.scrollHeight : 0,
      );
      iframe.style.height = height + "px";
      el.style.minHeight = height + "px";
    } catch (_) {
      iframe.style.height = "760px";
      el.style.minHeight = "760px";
    }
  }

  window.addEventListener("message", function (event) {
    try {
      const msg = JSON.parse(event.data);
      if (msg.from !== "cusdis" || msg.event !== "resize") return;
      const el = document.querySelector("#cusdis_thread");
      const iframe = el ? el.querySelector("iframe") : null;
      if (el && iframe) {
        window.setTimeout(function () {
          syncCusdisFrameHeight(el, iframe);
        }, 0);
      }
    } catch (_) {
    }
  });

  document.addEventListener("nav", renderCusdis);
  document.addEventListener("render", renderCusdis);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCusdis);
  } else {
    renderCusdis();
  }
})();
