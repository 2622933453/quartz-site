import type { QuartzComponent } from "@quartz-community/types"

export type CusdisCommentsOptions = {
  host?: string
  appId?: string
  lang?: string
}

export declare const CusdisComments: (opts?: CusdisCommentsOptions) => QuartzComponent
