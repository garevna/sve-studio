import type { TranslatedModel } from './TemplateBlockModel'

// The subset of a menu item/footer link that MenuLinkDialog.vue actually
// reads/writes (route/params/hash - never title) - lets that dialog work on
// both MenuItemModel/SubmenuItemModel and a footer's own type:'route'
// TemplateBlockModel nodes, which share this same shape, without coupling
// it to menu-specific types.
export interface LinkTarget {
  route?: string
  params?: object
  hash?: string
}

// Mirrors client-side's own src/types/common/MenuItemModel.ts by hand (same
// convention as TemplateBlockModel.ts in both repos - no shared package).
// One level of nesting only: a top-level item can have `submenu`, a
// submenu item cannot have its own children - confirmed against production's
// real menu-content.json and MainMenu.vue's rendering, which only ever
// reads one level deep.
// title: an item that leads to a page shows the page's name and has no
// title of its own, except as a deliberate exception (see
// utils/page-title.ts); an item that leads nowhere always has one.
export type SubmenuItemModel = {
  title?: TranslatedModel
  route: string
  params?: object
  query?: object
  // Scroll target within the linked page, e.g. "#block-<uuid>" - see
  // src/utils/block-label.ts / PageBlockPicker.vue for how the id is
  // chosen/generated. Resolved by client-side's router scrollBehavior, not
  // read anywhere in this editor's own preview.
  hash?: string
}

export type MenuItemModel = {
  title?: TranslatedModel
  route?: string
  params?: object
  hash?: string
  submenu?: SubmenuItemModel[]
  selected: string | null
  expanded: boolean
}
