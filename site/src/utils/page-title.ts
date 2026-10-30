// A page's name is the one place its name is kept (`title` on the page, in
// every language of the site; a plain string in pages saved before that).
// A menu item that leads to a page shows the page's name unless it has a
// text of its own - an exception. Same rules as the editor's
// src/utils/page-title.ts.

type Translated = Record<string, string | string[]>
export type PageTitle = Translated | string | undefined
type MenuLink = { title?: Translated, route?: string, params?: object, submenu?: MenuLink[] }

function text (value: unknown): string {
  return Array.isArray(value) ? value.join(' ').trim() : String(value ?? '').trim()
}

export function pageTitleText (title: PageTitle, locale: string, defaultLocale: string): string {
  if (!title) {
    return ''
  }
  if (typeof title === 'string') {
    return title.trim()
  }
  return text(title[locale]) || text(title[defaultLocale]) || Object.values(title).map(value => text(value)).find(Boolean) || ''
}

function linkedPageId (item: MenuLink): string | null {
  return item.route === 'dynamic-page' ? ((item.params as { pageId?: string } | undefined)?.pageId ?? null) : null
}

function hasOwnLabel (item: MenuLink): boolean {
  return !!item.title && Object.values(item.title).some(value => !!text(value))
}

// The menu with every item's text filled in for every language of the site:
// its own, or the name of the page it leads to.
// Items leading to a hidden page are left out, and so is a group left with
// nothing in it.
export function withMenuLabels<T extends MenuLink> (items: T[], pageTitles: Record<string, PageTitle>, locales: string[], defaultLocale: string, hidden: Set<string> = new Set()): T[] {
  const shown = (item: MenuLink) => {
    const pageId = linkedPageId(item)
    return !pageId || !hidden.has(pageId)
  }
  items = items
    .filter(item => shown(item))
    .map(item => item.submenu ? { ...item, submenu: item.submenu.filter(sub => shown(sub)) } : item)
    .filter(item => !item.submenu || item.submenu.length > 0)
  const label = (item: MenuLink): Translated => {
    const pageId = linkedPageId(item)
    const source = pageId && !hasOwnLabel(item) ? pageTitles[pageId] : item.title
    return Object.fromEntries(locales.map(locale => [locale, pageTitleText(source, locale, defaultLocale)]))
  }
  return items.map(item => ({
    ...item,
    title: label(item),
    ...(item.submenu ? { submenu: item.submenu.map(sub => ({ ...sub, title: label(sub) })) } : {}),
  }))
}
