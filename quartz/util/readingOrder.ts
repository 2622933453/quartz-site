import { QuartzPluginData } from "../plugins/vfile"
import { isFolderPath } from "./path"

// Keep interleaved sections (such as Prologue II) in the book's actual reading order.
const books: Record<string, string[]> = {
  "翻译/六百六十円的实情": [
    "封面",
    "目录",
    "prologuei",
    "第一章",
    "第二章",
    "第三章",
    "第四章",
    "prologueii",
    "第五章",
    "第六章",
    "epiloguewhataday",
    "后记",
  ],
}

type ReadingPage = { slug?: string; frontmatter?: { title?: string } }

function sectionKey(title: string) {
  const normalized = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s「」『』“”"'-]/g, "")
  return normalized.match(/^第[一二三四五六七八九十百零〇两\d]+章/)?.[0] ?? normalized
}

// undefined leaves unrelated folders to their existing date-based sorting.
export function compareReadingOrder(a: ReadingPage, b: ReadingPage): number | undefined {
  const folder = (a.slug ?? "").split("/").slice(0, -1).join("/")
  if (folder !== (b.slug ?? "").split("/").slice(0, -1).join("/")) return
  const order = books[folder]
  if (!order) return

  const rank = (page: ReadingPage) => {
    const names = [page.frontmatter?.title ?? "", (page.slug ?? "").split("/").pop() ?? ""]
    for (const name of names) {
      const index = order.indexOf(sectionKey(name))
      if (index !== -1) return index
    }
    return order.length
  }
  return rank(a) - rank(b) || (a.slug ?? "").localeCompare(b.slug ?? "", "zh-CN", { numeric: true })
}

export function sortFolderPages(a: QuartzPluginData, b: QuartzPluginData): number {
  const readingOrder = compareReadingOrder(a, b)
  if (readingOrder !== undefined) return readingOrder

  // Match folder-page's default ordering, including synthetic folders without a date type.
  const aFolder = isFolderPath(a.slug ?? "")
  const bFolder = isFolderPath(b.slug ?? "")
  if (aFolder !== bFolder) return aFolder ? -1 : 1
  if (a.dates && b.dates) {
    const aDate = a.defaultDateType ? a.dates[a.defaultDateType] : undefined
    const bDate = b.defaultDateType ? b.dates[b.defaultDateType] : undefined
    return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0)
  }
  if (a.dates) return -1
  if (b.dates) return 1
  return (a.frontmatter?.title ?? "")
    .toLowerCase()
    .localeCompare((b.frontmatter?.title ?? "").toLowerCase())
}
