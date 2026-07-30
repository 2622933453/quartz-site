import type { QuartzComponentConstructor } from "@quartz-community/types"

export interface RecentArticlesOptions {
  title?: string
  limit?: number
  excludeFolders?: string[]
  hideTagPages?: boolean
  hideFolderPages?: boolean
}

export declare const RecentArticles: QuartzComponentConstructor<RecentArticlesOptions>
