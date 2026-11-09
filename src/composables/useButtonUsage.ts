import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
import type { TemplatePageModel } from '@/types/TemplateBlockModel'
import { t } from '@/i18n'
import { useAjaxStore } from '@/stores/ajax'
import { useCommonStore } from '@/stores/common'
import { resolveLocaleText } from '@/utils/locale-text'

// Where one of the client's buttons is in use, and putting another button
// in its place - so a button can leave the set (UI Kit > Кнопки) without
// leaving pages with buttons that look like nothing.
//
// A button is used through its class, in a block's `class` (page and
// footer buttons, icon buttons) or a menu row's `buttonClass` (global.json
// menuStyle). Every page is read as the editor reads it - an unpublished
// draft first - and written back the same way: a page that had a draft
// keeps it a draft, so replacing a button never publishes someone's
// unfinished work; one that had none is published with the change.

const CLASS_KEYS = new Set(['class', 'buttonClass'])

export interface ButtonUsagePlace {
  // 'settings' = the site's general settings (the menu)
  kind: 'page' | 'settings'
  id: string
  label: string
  count: number
}

// Counts (and, given `to`, replaces) the class in every class field under
// `value`.
function visit (value: unknown, from: string, to?: string): number {
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + visit(item, from, to), 0)
  }
  if (!value || typeof value !== 'object') {
    return 0
  }
  let count = 0
  const record = value as Record<string, unknown>
  for (const [key, item] of Object.entries(record)) {
    if (CLASS_KEYS.has(key) && typeof item === 'string') {
      const tokens = item.split(/\s+/).filter(Boolean)
      if (tokens.includes(from)) {
        count++
        if (to !== undefined) {
          record[key] = tokens.map(token => (token === from ? to : token)).join(' ')
        }
      }
    } else {
      count += visit(item, from, to)
    }
  }
  return count
}

export function useButtonUsage () {
  const ajaxStore = useAjaxStore()
  const commonStore = useCommonStore()

  async function pageIds (): Promise<{ id: string, label: string }[]> {
    const pages = await ajaxStore.listDynamicPages()
    const list = pages.map(page => ({
      id: page.pageId,
      label: resolveLocaleText(page.title, commonStore.locale) || page.pageId,
    }))
    if (!list.some(page => page.id === 'footer-content')) {
      list.push({ id: 'footer-content', label: t('common.footer') })
    }
    return list
  }

  async function find (className: string): Promise<ButtonUsagePlace[]> {
    const places: ButtonUsagePlace[] = []
    for (const page of await pageIds()) {
      const content = await ajaxStore.getDynamicPageContent(page.id) as TemplatePageModel | null
      const count = visit(content, className)
      if (count > 0) {
        places.push({ kind: 'page', id: page.id, label: page.label, count })
      }
    }
    const settings = await ajaxStore.getGlobalSettings()
    const count = visit(settings, className)
    if (count > 0) {
      places.push({ kind: 'settings', id: 'global', label: t('common.menu'), count })
    }
    return places
  }

  async function replace (places: ButtonUsagePlace[], from: string, to: string) {
    for (const place of places) {
      if (place.kind === 'page') {
        const content = await ajaxStore.getDynamicPageContent(place.id) as TemplatePageModel
        visit(content, from, to)
        const draft = await ajaxStore.isDynamicPageUpdated(place.id)
        await ajaxStore.saveDynamicPage(place.id, content, { publish: !draft })
      } else {
        const settings = await ajaxStore.getGlobalSettings() as GlobalSettingsModel
        visit(settings, from, to)
        const draft = await ajaxStore.isGlobalSettingsUpdated()
        await ajaxStore.saveGlobalSettings(settings, { publish: !draft })
      }
    }
  }

  return { find, replace }
}
