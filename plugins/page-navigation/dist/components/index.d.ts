import type { QuartzComponent, QuartzPluginData } from "@quartz-community/types"

export interface PageNavigationOptions {
  prevLabel: string
  nextLabel: string
  sort: (a: QuartzPluginData, b: QuartzPluginData) => number | undefined
}

export declare const PageNavigation: (opts?: Partial<PageNavigationOptions>) => QuartzComponent
