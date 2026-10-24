import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom"

let disposeFootnotes: (() => void) | undefined

function setupFootnotes() {
  disposeFootnotes?.()
  const references = [...document.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]")]
  if (!references.length) return

  let activeReference: HTMLAnchorElement | undefined
  let popup: HTMLDivElement | undefined
  let stopPositioning: (() => void) | undefined

  function close(restoreFocus = false) {
    const reference = activeReference
    stopPositioning?.()
    stopPositioning = undefined
    popup?.remove()
    popup = undefined
    reference?.setAttribute("aria-expanded", "false")
    reference?.removeAttribute("aria-controls")
    activeReference = undefined
    if (restoreFocus) reference?.focus({ preventScroll: true })
  }

  function onClick(event: MouseEvent) {
    if (!(event.target instanceof Element)) return
    const reference = event.target.closest<HTMLAnchorElement>("a[data-footnote-ref]")
    if (reference && references.includes(reference)) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return
      const url = new URL(reference.href)
      if (url.origin !== location.origin || url.pathname !== location.pathname) return
      const id = url.hash.slice(1)
      let note = document.getElementById(id)
      if (!note) {
        try {
          note = document.getElementById(decodeURIComponent(id))
        } catch {
          return
        }
      }
      if (!note) return

      event.preventDefault()
      // The SPA router listens on window; keep this click on the current page.
      event.stopPropagation()
      if (activeReference === reference) {
        close(true)
        return
      }
      close()
      activeReference = reference

      const panel = document.createElement("div")
      panel.className = "footnote-popup"
      panel.id = "quartz-footnote-popup"
      panel.setAttribute("role", "dialog")
      panel.setAttribute("aria-label", `注释 ${reference.textContent?.trim() ?? ""}`)

      const closeButton = document.createElement("button")
      closeButton.type = "button"
      closeButton.className = "footnote-popup-close"
      closeButton.setAttribute("aria-label", "关闭注释")
      closeButton.textContent = "×"
      closeButton.addEventListener("click", () => close(true))

      const content = document.createElement("div")
      content.className = "footnote-popup-content"
      const copy = note.cloneNode(true) as HTMLElement
      copy.querySelectorAll("[data-footnote-backref]").forEach((element) => element.remove())
      copy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"))
      content.append(...copy.childNodes)
      panel.append(closeButton, content)
      document.body.appendChild(panel)
      popup = panel
      reference.setAttribute("aria-expanded", "true")
      reference.setAttribute("aria-controls", panel.id)

      stopPositioning = autoUpdate(reference, panel, () => {
        void computePosition(reference, panel, {
          strategy: "fixed",
          placement: "bottom",
          middleware: [offset(8), flip(), shift({ padding: 12 })],
        }).then(({ x, y }) => {
          if (popup !== panel) return
          Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, visibility: "visible" })
        })
      })
      closeButton.focus({ preventScroll: true })
      return
    }
    if (popup && !popup.contains(event.target)) close()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && popup) {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
  }

  for (const reference of references) {
    reference.setAttribute("aria-haspopup", "dialog")
    reference.setAttribute("aria-expanded", "false")
  }
  document.addEventListener("click", onClick)
  document.addEventListener("keydown", onKeydown)
  disposeFootnotes = () => {
    close()
    document.removeEventListener("click", onClick)
    document.removeEventListener("keydown", onKeydown)
    for (const reference of references) {
      reference.removeAttribute("aria-haspopup")
      reference.removeAttribute("aria-expanded")
    }
    disposeFootnotes = undefined
  }
}

document.addEventListener("nav", setupFootnotes)
document.addEventListener("render", setupFootnotes)
document.addEventListener("prenav", () => disposeFootnotes?.())
