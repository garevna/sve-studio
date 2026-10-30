import type { TranslatedModel } from '@/types/TemplateBlockModel'
import { defaultSiteLocale, siteLocales } from '@/utils/locale-text'

// A page's name is the ONE place its name is kept: the pages list, the
// editor, and the menu all show it from here. `title` on the page, in every
// language of the site ({uk, en, de}); a page saved before that has a plain
// string, which stands for every language.
//
// A menu item that leads to a page has no text of its own - it shows the
// page's name, and renaming the page renames the menu item. Only as an
// exception (a shorter word in the menu) does it carry its own `title`; an
// item that leads nowhere (a group like "Про нас") always has its own.
// Same file in site/src/utils.

export type PageTitle = TranslatedModel | string | undefined

type MenuLink = { title?: TranslatedModel, route?: string, params?: object }

function text (value: unknown): string {
  return Array.isArray(value) ? value.join(' ').trim() : String(value ?? '').trim()
}

// The name in this language - or, if it has none yet, in the site's main
// language, or any it has.
export function pageTitleText (title: PageTitle, locale: string): string {
  if (!title) {
    return ''
  }
  if (typeof title === 'string') {
    return title.trim()
  }
  return text(title[locale]) || text(title[defaultSiteLocale()]) || Object.values(title).map(value => text(value)).find(Boolean) || ''
}

// Every language of the site, from a name in any shape.
export function translatedPageTitle (title: PageTitle): TranslatedModel {
  return Object.fromEntries(siteLocales().map(locale => [locale, typeof title === 'string' ? title : text(title?.[locale])]))
}

// The page a menu item (or any link of that shape) leads to.
export function linkedPageId (item: { route?: string, params?: object }): string | null {
  return item.route === 'dynamic-page' ? ((item.params as { pageId?: string } | undefined)?.pageId ?? null) : null
}

// Whether the item carries a text of its own (any language filled in).
export function hasOwnLabel (item: MenuLink): boolean {
  return !!item.title && Object.values(item.title).some(value => !!text(value))
}

// What a menu item says: its own text if it has one, else the page's name.
export function menuLabel (item: MenuLink, locale: string, pageTitles: Record<string, PageTitle>): string {
  const pageId = linkedPageId(item)
  if (pageId && !hasOwnLabel(item)) {
    return pageTitleText(pageTitles[pageId], locale)
  }
  return pageTitleText(item.title, locale)
}

// An item whose own text only repeats the page's name has no reason to
// keep it: dropped, so it follows the page from now on.
export function dropRepeatedLabels<T extends MenuLink & { submenu?: MenuLink[] }> (items: T[], pageTitles: Record<string, PageTitle>): T[] {
  const tidy = (item: MenuLink) => {
    const pageId = linkedPageId(item)
    if (!pageId || !item.title || !(pageId in pageTitles)) {
      return
    }
    const repeats = Object.entries(item.title).every(([locale, value]) => !text(value) || text(value) === pageTitleText(pageTitles[pageId], locale))
    if (repeats) {
      delete item.title
    }
  }
  for (const item of items) {
    tidy(item)
    for (const sub of item.submenu ?? []) {
      tidy(sub)
    }
  }
  return items
}
