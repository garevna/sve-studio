export type SubmenuItemModel = {
  title: {
    uk: string
    en: string
    de: string
  }
  route: string
  params?: object
  query?: object
  // Scroll target within the linked page, e.g. "#faq-section" - same
  // pattern as BaseBlock.hash (TemplateBlockModel.ts) for type:'route'
  // blocks, just extended to menu items. Resolved by the router's own
  // scrollBehavior (router/index.ts), not read manually here.
  hash?: string
  callback?: () => void
}

export type MenuItemModel = {
  title: {
    uk: string
    en: string
    de: string
  }
  route?: string
  params?: object
  hash?: string
  callback?: () => void
  submenu?: SubmenuItemModel[]
  selected: string | null
  expanded: boolean
}
