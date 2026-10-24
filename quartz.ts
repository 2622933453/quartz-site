import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import { compareReadingOrder, sortFolderPages } from "./quartz/util/readingOrder"

componentRegistry.setOptionOverrides("folder-page", { sort: sortFolderPages })
componentRegistry.setOptionOverrides("page-navigation", { sort: compareReadingOrder })

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
