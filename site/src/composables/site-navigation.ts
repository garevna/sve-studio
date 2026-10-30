import type { LinkSource } from '../services/site-links'
import type { MenuItemModel } from '../types/common'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { isMissingRoute, linkedPageId, sitePath } from '../services/site-links'
import { useCommonStore } from '../stores/common'

// Following links inside the site: menu items, buttons, footer links.
export function useSiteNavigation () {
  const router = useRouter()
  const commonStore = useCommonStore()

  // The address of a page in the current language (or another one).
  function pagePath (pageId: string, hash = '', locale = commonStore.locale): string {
    return sitePath(pageId, locale, commonStore.defaultLocale, hash)
  }

  // Where a stored link leads, or null when nowhere on this site.
  function linkPath (source: LinkSource): string | null {
    const pageId = linkedPageId(source)
    return pageId ? pagePath(pageId, source.hash || '') : null
  }

  async function follow (source: LinkSource) {
    const path = linkPath(source)
    if (path) {
      await router.push(path)
    }
  }

  // The same page in another language.
  async function switchLocale (locale: string) {
    await router.push(pagePath(commonStore.currentPageId, '', locale))
  }

  // The menu without what leads nowhere on this site (account pages of the
  // original booking site); a group left empty goes too.
  const visibleMenu = computed<MenuItemModel[]>(() => commonStore.mainMenuContent
    .map(item => item.submenu ? { ...item, submenu: item.submenu.filter(sub => !isMissingRoute(sub)) } : item)
    .filter(item => item.submenu ? item.submenu.length > 0 : !isMissingRoute(item)))

  // Whether a menu entry (or one in its group) is the page shown.
  function isCurrent (item: LinkSource & { submenu?: LinkSource[] }): boolean {
    const current = commonStore.currentPageId
    return linkedPageId(item) === current || !!item.submenu?.some(sub => linkedPageId(sub) === current)
  }

  return { pagePath, linkPath, follow, switchLocale, visibleMenu, isCurrent }
}
