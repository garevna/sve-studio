import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

// The footer's list of links to pages and in-page anchors, as a block type
// of its own.
//
// It used to be recognised by shape - "a type:'section' whose children are
// all type:'route'". That is exactly as fragile as it sounds: `section` is
// the generic container, anything at all can be put in one, and a list that
// happened to hold a heading alongside its links stopped being a link list.
// Worse, the middle footer column IS such a section, so the column itself
// matched the shape and its links were rendered as loose children of a
// column - which is why they came out blank (type:'route' has no generic
// renderer at all).
//
// A type says what the block IS, so the editor can offer exactly the
// controls that make sense for it: edit the entries in a dialog, format
// every entry at once, reorder them. No other block type needs that
// combination, and this one needs nothing else.
export const PAGE_LINKS_TYPE = 'page-links'

// The contacts list is still a plain type:'section' marked by this id (see
// FooterColumn.vue) - one constant so the id is never spelled out twice.
export const CONTACTS_LIST_ID = 'footer-contacts-list'

// Content saved before the type existed. Recognised (not rejected) so
// nothing has to be migrated on the server before the editor can open it -
// normalisePageLinks below rewrites it in place the first time the footer
// is opened, and the next save carries the new type.
export function isLegacyLinksSection (block: TemplateBlockModel): boolean {
  return block.type === 'section'
    && !!block.children?.length
    && block.children.every(child => child.type === 'route')
}

export function isPageLinks (block: TemplateBlockModel): boolean {
  return block.type === PAGE_LINKS_TYPE
}

// Turns both shapes into the current one, in place. Idempotent - a block
// that already carries the type is left exactly as it is, so merely opening
// the footer never marks it dirty for autosave.
export function normalisePageLinks (block: TemplateBlockModel): boolean {
  if (isLegacyLinksSection(block)) {
    block.type = PAGE_LINKS_TYPE
    return true
  }
  return false
}

// How big the Visa/Mastercard logo may be shown. A short list of named
// sizes rather than a free pixel field: this is a supplied image with one
// fixed aspect ratio, and the only real question is how prominent it should
// be in the column - a number entry would invite arbitrary values that make
// it look wrong next to everything else.
//
// The width is what is stored (on the block's own `width`); the height
// follows from the artwork's own 160x41 proportions, so the logo can never
// be stretched.
export const VISA_LOGO_NATURAL_WIDTH = 160
export const VISA_LOGO_NATURAL_HEIGHT = 41

export const VISA_LOGO_SIZES: { label: string, width: number }[] = [
  { label: 'Маленький', width: 120 },
  { label: 'Середній', width: 160 },
  { label: 'Великий', width: 200 },
  { label: 'Дуже великий', width: 240 },
]

export function visaLogoHeight (width: number): number {
  return Math.round(width * VISA_LOGO_NATURAL_HEIGHT / VISA_LOGO_NATURAL_WIDTH)
}

// Which one-off block this is, if any - the same vocabulary the insert menu
// uses to hide what a footer already has (see FooterInsertMenu.vue). Kept
// here rather than in either component so the two can never drift into
// disagreeing about what counts as "already present".
export function footerBlockKind (block: TemplateBlockModel): string | null {
  if (block.type === 'component') {
    const byComponent: Record<string, string> = {
      FeedbackCard: 'feedback',
      FooterIcons: 'icons',
      FooterVisaLogo: 'visa',
    }
    return byComponent[block.content as string] ?? null
  }
  if (block.id === CONTACTS_LIST_ID) {
    return 'contacts'
  }
  if (isPageLinks(block) || isLegacyLinksSection(block)) {
    return 'links'
  }
  return null
}

// Every kind anywhere in the footer, however deeply nested - the right
// column keeps its blocks inside a grouping section, so a shallow scan
// would miss the social icons that are already there.
export function collectFooterKinds (block: TemplateBlockModel, found = new Set<string>()): Set<string> {
  const kind = footerBlockKind(block)
  if (kind) {
    found.add(kind)
  }
  for (const child of block.children || []) {
    collectFooterKinds(child, found)
  }
  return found
}
