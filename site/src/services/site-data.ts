import type { GlobalSettingsModel, MenuItemModel, SeoSettingsModel, TemplateBlockModel, TemplatePageModel } from '../types/common'
import { dbRequest } from '../db/client'

// Where the site reads its content - the one place to change for a site
// that is published from a server.
//
// The demo reads the browser's own copy of the site: the editor's local
// database, which also holds changes not saved yet - so the site shows
// exactly what the visitor has built, and nothing of theirs is ever kept on
// the server. A client's real site would read the content API here instead
// (GET /api/content/...), on the server as well as in the browser.

export type SiteSettings = GlobalSettingsModel & { footerVariant?: number }

export function getSiteSettings (): Promise<SiteSettings> {
  return dbRequest<SiteSettings>('settings', 'get', { key: 'global' })
}

export function getPalette (): Promise<Record<string, string>> {
  return dbRequest<Record<string, string>>('settings', 'get', { key: 'palette' })
}

export async function getMenu (): Promise<MenuItemModel[]> {
  return (await dbRequest<MenuItemModel[] | null>('settings', 'get', { key: 'menu-content' })) ?? []
}

// Every page's name, by id - what a menu item leading to a page shows.
export async function getPageTitles (): Promise<Record<string, unknown>> {
  const pages = (await dbRequest<{ pageId: string, title?: unknown }[]>('pages', 'list').catch(() => [])) ?? []
  return Object.fromEntries(pages.map(page => [page.pageId, page.title]))
}

// null: no such page. Blocks hidden in the editor are left out here, so no
// part of the site ever sees them.
export async function getPage (pageId: string): Promise<TemplatePageModel | null> {
  const page = (await dbRequest<TemplatePageModel | null>('pages', 'get', { pageId }).catch(() => null)) ?? null
  if (page?.blocks) {
    page.blocks = page.blocks.filter(block => !(block as { hidden?: boolean }).hidden)
  }
  return page
}

export async function getFooter (): Promise<TemplateBlockModel | null> {
  return (await dbRequest<TemplateBlockModel | null>('pages', 'get', { pageId: 'footer-content' }).catch(() => null)) ?? null
}

export async function getSeoSettings (): Promise<SeoSettingsModel | null> {
  return (await dbRequest<SeoSettingsModel | null>('settings', 'get', { key: 'seo' }).catch(() => null)) ?? null
}
