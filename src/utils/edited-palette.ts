import type { createVuetify } from 'vuetify'
import { sitePalette } from '@/configs/neon-palette'
import { neonGlowDeclarations } from '@/configs/site-style'
import { useAjaxStore } from '@/stores/ajax'
import { buildColorScheme, isHexColor } from '@/utils/build-color-scheme'
import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
import { hexToRgbTriple } from '@/utils/hex-to-rgb-triple'
import { APP_THEME_NAME } from '@/utils/vuetify-theme-names'

// The colours the edited site wears in the editor, as on the site: the
// palette's CSS variables (the site's stylesheets read bare
// var(--primary)...), the --v-theme-* triples Vuetify's colour classes read,
// and the edited site's Vuetify theme.
//
// palette.json's own colours go on <html>: the site's stylesheets are
// global here and paint the editor's own screens with them too
// (.v-application's background is var(--homefone)), and those stay light.
// What the page wears - «Неон»'s colours, when the site is «Неон» - goes on
// the edited page's scope only, over them. Put on
// at the start (bootstrap/editor-app.ts) and again whenever they change -
// the palette edited, the site's style switched to or from «Неон», whose
// palette replaces palette.json's (configs/neon-palette.ts).

let themeVarStyle: HTMLStyleElement | null = null
let vuetify: ReturnType<typeof createVuetify> | null = null

export function applyEditedPalette (palette: Record<string, string>, base: Record<string, string> = palette, extra: Record<string, string> | null = null) {
  for (const [name, value] of Object.entries(base)) {
    document.documentElement.style.setProperty(`--${name}`, value)
  }
  // Vuetify defines the triples only on .v-theme--{name} elements - the
  // edited page's scope gets them directly, with the page's own colours.
  const rules = [
    ...Object.entries(palette).map(([name, value]) => `--${name}: ${value};`),
    // «Неон»'s glow, read from the page's colours, not <html>'s
    ...Object.entries(extra ?? {}).map(([name, value]) => `${name}: ${value};`),
    ...Object.entries(palette)
      .filter(([, value]) => isHexColor(value))
      .map(([name, value]) => `--v-theme-${name}: ${hexToRgbTriple(value)};`),
  ].join('\n  ')
  if (!themeVarStyle) {
    themeVarStyle = document.createElement('style')
    document.head.append(themeVarStyle)
  }
  themeVarStyle.textContent = `.${EDITED_APP_SCOPE_CLASS} {\n  ${rules}\n}`
  const theme = vuetify?.theme.themes.value[APP_THEME_NAME]
  if (theme) {
    Object.assign(theme.colors, buildColorScheme(palette).colors)
  }
}

// Once Vuetify exists, its theme follows every later change too.
export function followEditedPalette (instance: ReturnType<typeof createVuetify>) {
  vuetify = instance
}

// The colours the site wears now: palette.json's, a ready palette's, or
// «Неон»'s (configs/neon-palette.ts) - what a colour picker should show,
// since a key is drawn on the page in these.
export async function wornPalette (): Promise<Record<string, string>> {
  const ajaxStore = useAjaxStore()
  const [palette, settings] = await Promise.all([ajaxStore.getPalette(), ajaxStore.getGlobalSettings()])
  return sitePalette(palette ?? {}, settings)
}

// The palette and the general settings read anew, and worn.
export async function refreshEditedPalette () {
  const ajaxStore = useAjaxStore()
  const [palette, settings] = await Promise.all([ajaxStore.getPalette(), ajaxStore.getGlobalSettings()])
  if (palette) {
    applyEditedPalette(sitePalette(palette, settings), palette, neonGlowDeclarations(settings?.neonGlow))
  }
}
