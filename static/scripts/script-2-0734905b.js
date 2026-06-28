
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
    el.dataset.theme = getCurrentTheme();
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
      syncCusdisTheme();
    });
  }

  function getCurrentTheme() {
    const theme = document.documentElement.getAttribute("saved-theme");
    return theme === "dark" ? "dark" : "light";
  }

  function syncCusdisTheme(theme) {
    const nextTheme = theme || getCurrentTheme();
    const el = document.querySelector("#cusdis_thread");
    if (el) el.dataset.theme = nextTheme;
    if (window.CUSDIS && typeof window.CUSDIS.setTheme === "function") {
      window.CUSDIS.setTheme(nextTheme);
    }
    const iframe = el ? el.querySelector("iframe") : null;
    if (iframe) {
      window.setTimeout(function () {
        customizeCusdisFrame(el);
      }, 50);
    }
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
          '*,',
          '*::before,',
          '*::after {',
          '  box-sizing: border-box !important;',
          '}',
          'body {',
          '  font-family: "Source Sans Pro", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;',
          '  color: #2b2b2b !important;',
          '}',
          'label {',
          '  font-family: inherit !important;',
          '  font-size: 1rem !important;',
          '  font-weight: 600 !important;',
          '  color: #4e4e4e !important;',
          '}',
          'input,',
          'textarea {',
          '  font-family: inherit !important;',
          '  font-size: 1rem !important;',
          '  line-height: 1.5 !important;',
          '  border-radius: 8px !important;',
          '  border: 1px solid #e5e5e5 !important;',
          '  background: #faf8f8 !important;',
          '  color: #2b2b2b !important;',
          '  outline: none !important;',
          '  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;',
          '}',
          'input:focus,',
          'textarea:focus {',
          '  border-color: #284b63 !important;',
          '  box-shadow: 0 0 0 3px rgba(40, 75, 99, 0.12) !important;',
          '}',
          'textarea[name="reply_content"] {',
          '  min-height: 10rem !important;',
          '  resize: vertical !important;',
          '}',
          'button {',
          '  font-family: inherit !important;',
          '  font-size: 1rem !important;',
          '  font-weight: 700 !important;',
          '  line-height: 1.2 !important;',
          '  border-radius: 8px !important;',
          '  border: 1px solid #e5e5e5 !important;',
          '  background: #faf8f8 !important;',
          '  color: #284b63 !important;',
          '  cursor: pointer !important;',
          '  transition: border-color 0.15s ease, transform 0.15s ease, background-color 0.15s ease !important;',
          '}',
          'button:hover {',
          '  border-color: #284b63 !important;',
          '  transform: translateY(-1px) !important;',
          '}',
          '.dark label {',
          '  color: #d4d4d4 !important;',
          '}',
          '.dark input,',
          '.dark textarea {',
          '  border-color: #393639 !important;',
          '  color: #ebebec !important;',
          '  background: #161618 !important;',
          '}',
          '.dark input:focus,',
          '.dark textarea:focus {',
          '  border-color: #7b97aa !important;',
          '  box-shadow: 0 0 0 3px rgba(123, 151, 170, 0.18) !important;',
          '}',
          '.dark button {',
          '  border-color: #393639 !important;',
          '  color: #7b97aa !important;',
          '  background: #161618 !important;',
          '}',
          '.dark button:hover {',
          '  border-color: #7b97aa !important;',
          '}',
          '.dark a,',
          '.dark .text-gray-500,',
          '.dark .dark\\:text-gray-100,',
          '.dark .dark\\:text-gray-200,',
          '.dark .dark\\:text-gray-400 {',
          '  color: #d4d4d4 !important;',
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
  document.addEventListener("themechange", function (event) {
    syncCusdisTheme(event.detail && event.detail.theme);
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderCusdis);
  } else {
    renderCusdis();
  }
})();
