import type { SiteStyle } from '@/configs/site-style'
import { shallowRef } from 'vue'
import { applySiteStyle, resolveSiteStyle } from '@/configs/site-style'
import { useAjaxStore } from '@/stores/ajax'

// The site's style (configs/site-style.ts) in the editor: read from the
// general settings once, worn as a class on <html> like on the site - so
// the page canvas and the UI Kit's samples show it - and changed in the
// UI Kit.
const style = shallowRef<SiteStyle>(resolveSiteStyle(undefined))
let loading: Promise<void> | null = null

export function useSiteStyle () {
  const ajaxStore = useAjaxStore()

  function load () {
    loading ??= ajaxStore.getGlobalSettings()
      .then(settings => {
        style.value = resolveSiteStyle(settings?.siteStyle)
        applySiteStyle(document.documentElement, style.value)
      })
      .catch(() => {
        loading = null
      })
    return loading
  }

  // Saved into global.json at once - one choice, nothing else to confirm.
  async function set (value: SiteStyle) {
    const settings = await ajaxStore.getGlobalSettings()
    if (!settings) {
      return
    }
    style.value = value
    applySiteStyle(document.documentElement, value)
    await ajaxStore.saveGlobalSettings({ ...settings, siteStyle: value }, { publish: true })
  }

  return { style, load, set }
}
