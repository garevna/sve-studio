import type { SiteStyle, SiteStylePart, SiteStyleParts, WaveEdgeSide } from '@/configs/site-style'
import { shallowRef } from 'vue'
import { applySiteStyle, partStyle, resolveSiteStyle, resolveWaveEdge } from '@/configs/site-style'
import { useAjaxStore } from '@/stores/ajax'
import { refreshEditedPalette } from '@/utils/edited-palette'

// The site's style (configs/site-style.ts) in the editor: read from the
// general settings once, worn as classes on <html> like on the site - so
// the page canvas and the UI Kit's samples show it - and changed with the
// «Стиль сайту» button on the top bar (SiteStyleMenu.vue): the whole
// site's, or one part's own; and the edge «Хвиля» waves on the pictures.
const style = shallowRef<SiteStyle>(resolveSiteStyle(undefined))
const parts = shallowRef<SiteStyleParts>({})
const waveEdge = shallowRef<WaveEdgeSide>(resolveWaveEdge(undefined))
// «Неон»'s glow: a palette colour key, '' for the default gold
const neonGlow = shallowRef('')
let loading: Promise<void> | null = null

export function useSiteStyle () {
  const ajaxStore = useAjaxStore()

  function apply () {
    applySiteStyle(document.documentElement, style.value, parts.value, waveEdge.value, neonGlow.value)
  }

  function load () {
    loading ??= ajaxStore.getGlobalSettings()
      .then(settings => {
        style.value = resolveSiteStyle(settings?.siteStyle)
        parts.value = settings?.siteStyleParts ?? {}
        waveEdge.value = resolveWaveEdge(settings?.siteStyleWaveEdge)
        neonGlow.value = settings?.neonGlow ?? ''
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
    // bottom, the default, is not written down
    const siteStyleWaveEdge = waveEdge.value === 'bottom' ? undefined : waveEdge.value
    await ajaxStore.saveGlobalSettings({ ...settings, siteStyle: style.value, siteStyleParts, siteStyleWaveEdge, neonGlow: neonGlow.value || undefined }, { publish: true })
  }

  // «Неон» brings its own palette (configs/neon-palette.ts): the page's
  // colours follow once it is saved.
  async function set (value: SiteStyle) {
    style.value = value
    apply()
    await save()
    await refreshEditedPalette()
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

  async function setWaveEdge (value: WaveEdgeSide) {
    waveEdge.value = value
    apply()
    await save()
  }

  async function setNeonGlow (value: string) {
    neonGlow.value = value
    apply()
    await save()
    // the edited page wears the glow from its own colours too
    await refreshEditedPalette()
  }

  // The glow read anew - after something else wrote it (a ready palette
  // picked, ReadyPalettesView.vue), so the next save keeps it.
  async function reloadGlow () {
    const settings = await ajaxStore.getGlobalSettings()
    neonGlow.value = settings?.neonGlow ?? ''
    apply()
  }

  // The style a part actually wears.
  function of (part: SiteStylePart): SiteStyle {
    return partStyle(style.value, parts.value, part)
  }

  return { style, parts, waveEdge, neonGlow, load, set, setPart, setWaveEdge, setNeonGlow, reloadGlow, of }
}
