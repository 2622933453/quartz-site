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
  // 翻译章节按最近新增或修改时间参与首页排序，其他文章沿用原日期规则。
  if (isTranslation(page)) {
    const created = page.dates?.created
    const modified = page.dates?.modified
    const latest =
      created && modified ? (created > modified ? created : modified) : (modified ?? created)
    return { ...page, defaultDateType: "modified", dates: { ...page.dates, modified: latest } }
  }
  const defaultDateType = page.defaultDateType ?? cfg.defaultDateType
  return defaultDateType ? { ...page, defaultDateType } : page
}

const isTranslation = (page) => (page.slug ?? "").startsWith("翻译/")

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
    let hasTranslation = false

    const pages = allFiles
      .filter((page) => page.unlisted !== true)
      .filter((page) => !options.hideTagPages || !isTagPage(page.slug))
      .filter((page) => !options.hideFolderPages || !isFolderPath(page.slug ?? ""))
      .filter(
        (page) => !isTranslation(page) || !["封面", "目录"].includes(page.slug.split("/").at(-1)),
      )
      .filter((page) => {
        const slug = page.slug ?? ""
        return !excludedFolders.some((folder) => slug === folder || slug.startsWith(`${folder}/`))
      })
      .sort((left, right) =>
        sortByDate(withResolvedDateType(left, cfg), withResolvedDateType(right, cfg)),
      )
      // 先合并翻译目录，再截取条数，让其他文章补足首页列表。
      .filter((page) => {
        if (!isTranslation(page)) return true
        if (hasTranslation) return false
        hasTranslation = true
        return true
      })
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
