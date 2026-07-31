import { jsx, jsxs } from "preact/jsx-runtime"
import { getDate, byDateAndAlphabetical } from "@quartz-community/utils/sort"
import { isFolderPath, resolveRelative } from "@quartz-community/utils/path"

const isTagPage = (slug = "") =>
  slug === "tags" || slug === "tags/index" || slug.startsWith("tags/")

const formatNumericDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}

const withResolvedDateType = (page, cfg) => {
  const defaultDateType = page.defaultDateType ?? cfg.defaultDateType
  return defaultDateType ? { ...page, defaultDateType } : page
}

const defaultOptions = {
  title: "近期文章更新",
  limit: 4,
  excludeFolders: ["diary"],
  hideTagPages: true,
  hideFolderPages: true,
}

export const RecentArticles = (userOptions = {}) => {
  const Component = ({ allFiles, fileData, displayClass, cfg }) => {
    const options = { ...defaultOptions, ...userOptions }
    const excludedFolders = options.excludeFolders ?? []
    const sortByDate = byDateAndAlphabetical()

    const pages = allFiles
      .filter((page) => page.unlisted !== true)
      .filter((page) => !options.hideTagPages || !isTagPage(page.slug))
      .filter((page) => !options.hideFolderPages || !isFolderPath(page.slug ?? ""))
      .filter((page) => {
        const slug = page.slug ?? ""
        return !excludedFolders.some(
          (folder) => slug === folder || slug.startsWith(`${folder}/`),
        )
      })
      .sort((left, right) =>
        sortByDate(withResolvedDateType(left, cfg), withResolvedDateType(right, cfg)),
      )
      .slice(0, options.limit)

    const pageSlug = fileData.slug ?? "index"
    return jsxs("div", {
      class: [displayClass, "recent-notes"].filter(Boolean).join(" "),
      children: [
        jsx("h3", { children: options.title }),
        jsx("ul", {
          class: "recent-ul",
          children: pages.map((page) => {
            const datedPage = withResolvedDateType(page, cfg)
            const date = getDate(datedPage)
            const href = resolveRelative(pageSlug, page.slug)
            return jsx("li", {
              class: "recent-li",
              children: jsxs("a", {
                href,
                class: "section recent-card-link internal",
                children: [
                  jsx("div", {
                    class: "desc",
                    children: jsx("h3", {
                      children: page.frontmatter?.title ?? "Untitled",
                    }),
                  }),
                  date
                    ? jsx("p", {
                        class: "meta",
                        children: jsx("time", {
                          datetime: date.toISOString(),
                          children: formatNumericDate(date),
                        }),
                      })
                    : null,
                ],
              }),
            })
          }),
        }),
      ],
    })
  }

  Component.css = ""
  return Component
}
