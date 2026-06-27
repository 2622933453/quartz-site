import type { QuartzComponent } from "@quartz-community/types"

export interface PageNavigationOptions {
  prevLabel: string
  nextLabel: string
}

export declare const PageNavigation: (opts?: Partial<PageNavigationOptions>) => QuartzComponent
