import type { SiteStyle, SiteStylePart, SiteStyleParts } from '@/configs/site-style'
import { shallowRef } from 'vue'
import { applySiteStyle, partStyle, resolveSiteStyle } from '@/configs/site-style'
import { useAjaxStore } from '@/stores/ajax'

// The site's style (configs/site-style.ts) in the editor: read from the
// general settings once, worn as classes on <html> like on the site - so
// the page canvas and the UI Kit's samples show it - and changed with the
// page editor's «Стиль» button (SiteStyleMenu.vue): the whole site's, or
// one part's own.
const style = shallowRef<SiteStyle>(resolveSiteStyle(undefined))
const parts = shallowRef<SiteStyleParts>({})
let loading: Promise<void> | null = null

export function useSiteStyle () {
  const ajaxStore = useAjaxStore()

  function apply () {
    applySiteStyle(document.documentElement, style.value, parts.value)
  }

  function load () {
    loading ??= ajaxStore.getGlobalSettings()
      .then(settings => {
        style.value = resolveSiteStyle(settings?.siteStyle)
        parts.value = settings?.siteStyleParts ?? {}
        apply()
      })
      .catch(() => {
        loading = null
      })
    return loading
  }

  // Saved into global.json at once - one choice, nothing else to confirm.
  async function save () {
    const settings = await ajaxStore.getGlobalSettings()
    if (!settings) {
      return
    }
    const siteStyleParts = Object.keys(parts.value).length > 0 ? parts.value : undefined
    await ajaxStore.saveGlobalSettings({ ...settings, siteStyle: style.value, siteStyleParts }, { publish: true })
  }

  async function set (value: SiteStyle) {
    style.value = value
    apply()
    await save()
  }

  // null: the part follows the site's style again.
  async function setPart (part: SiteStylePart, value: SiteStyle | null) {
    const next = { ...parts.value }
    if (value) {
      next[part] = value
    } else {
      delete next[part]
    }
    parts.value = next
    apply()
    await save()
  }

  // The style a part actually wears.
  function of (part: SiteStylePart): SiteStyle {
    return partStyle(style.value, parts.value, part)
  }

  return { style, parts, load, set, setPart, of }
}
