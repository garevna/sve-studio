import type { ClientApiDocument } from '@sve/dock'
import type { GlobalSettingsModel, MenuItemModel, PopupsDocument, SeoSettingsModel, TemplateBlockModel, TemplatePageModel } from '../types/common'
import { withDefaultPopups } from '../configs/default-popups'
import { withDefaultCalendars, withDefaultLooks } from '../configs/popup-looks'
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

// Every page's name, by id - what a menu item leading to a page shows -
// and the pages hidden in the editor, which the menu leaves out.
export async function getPageTitles (): Promise<{ titles: Record<string, unknown>, hidden: Set<string> }> {
  const pages = (await dbRequest<{ pageId: string, title?: unknown, visible?: boolean }[]>('pages', 'list').catch(() => [])) ?? []
  return {
    titles: Object.fromEntries(pages.map(page => [page.pageId, page.title])),
    hidden: new Set(pages.filter(page => page.visible === false).map(page => page.pageId)),
  }
}

// null: no such page. Blocks hidden in the editor are left out here, so no
// part of the site ever sees them.
// includeHidden: the page is wanted even when it is hidden in the editor
// (the editor's own preview - see App.vue).
export async function getPage (pageId: string, { includeHidden = false } = {}): Promise<TemplatePageModel | null> {
  const page = (await dbRequest<TemplatePageModel | null>('pages', 'get', { pageId }).catch(() => null)) ?? null
  // A page hidden in the editor is not there for a visitor.
  if ((page as { visible?: boolean } | null)?.visible === false && !includeHidden) {
    return null
  }
  if (page?.blocks) {
    page.blocks = page.blocks.filter(block => !(block as { hidden?: boolean }).hidden)
  }
  return page
}

export async function getFooter (): Promise<TemplateBlockModel | null> {
  return (await dbRequest<TemplateBlockModel | null>('pages', 'get', { pageId: 'footer-content' }).catch(() => null)) ?? null
}

// The site's popups - any button on any page may open one.
// With them, the client's looks of popups and calendars (UI Kit).
export async function getPopups () {
  const document = await dbRequest<PopupsDocument | null>('settings', 'get', { key: 'popups' }).catch(() => null)
  // the base package's popups are there whatever the stored list says
  return { popups: withDefaultPopups(document?.popups ?? []), looks: withDefaultLooks(document), calendars: withDefaultCalendars(document) }
}

// The docking block's settings: the client's API (packages/dock).
export async function getClientApi (): Promise<ClientApiDocument | null> {
  return (await dbRequest<ClientApiDocument | null>('settings', 'get', { key: 'client-api' }).catch(() => null)) ?? null
}

export async function getSeoSettings (): Promise<SeoSettingsModel | null> {
  return (await dbRequest<SeoSettingsModel | null>('settings', 'get', { key: 'seo' }).catch(() => null)) ?? null
}
