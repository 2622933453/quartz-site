import { h } from "preact"

function pathToRoot(slug) {
  let rootPath = slug
    .split("/")
    .filter((segment) => segment !== "")
    .slice(0, -1)
    .map(() => "..")
    .join("/")

  return rootPath || "."
}

const PageTitle = () => {
  const Component = ({ fileData, cfg, displayClass }) => {
    const title = cfg?.pageTitle ?? "Untitled"
    const characters = Array.from(title)
    const middle = (characters.length - 1) / 2
    const radius = Math.max(middle, 1)
    const className = ["page-title", displayClass].filter(Boolean).join(" ")

    return h(
      "h2",
      { class: className },
      h(
        "a",
        {
          href: pathToRoot(fileData.slug ?? ""),
          "aria-label": title,
        },
        h(
          "span",
          { class: "page-title-letters", "aria-hidden": "true" },
          characters.map((character, index) => {
            const normalized = (index - middle) / radius
            const offset = -10 * (1 - normalized * normalized)
            const rotation = normalized * 3

            return h(
              "span",
              {
                class: "page-title-char",
                style: {
                  "--arch-y": `${offset.toFixed(2)}px`,
                  "--arch-r": `${rotation.toFixed(2)}deg`,
                },
              },
              character === " " ? "\u00a0" : character,
            )
          }),
        ),
      ),
    )
  }

  Component.displayName = "PageTitle"
  Component.css = `
.page-title {
  margin: 0;
  font-family: var(--titleFont);
}

.page-title-letters {
  display: inline-flex;
  align-items: flex-end;
  padding: 0.75rem 0.15rem 0.15rem;
}

.page-title-char {
  display: inline-block;
  transform: translateY(var(--arch-y)) rotate(var(--arch-r));
  transform-origin: 50% 100%;
}
`

  return Component
}

export { PageTitle }
