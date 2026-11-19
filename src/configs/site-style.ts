// The site's style - «Класика», «Штрих», «Хвиля» or «Неон» - one look for the whole
// site, kept in global.json `siteStyle`. A client who likes some of one and
// some of another mixes them: each part of the site (cards, buttons,
// footer, menu...) can take a style of its own (`siteStyleParts`), or, left
// unset, the site's. Chosen with the «Стиль сайту» button on the Верф's
// top bar (SiteStyleMenu.vue).
//
// The site wears them as classes on <html>: site-style-<style> for the
// site, site-style-<part>-<style> for each part as it actually is (its own
// or the site's). The UI Kit's stylesheets (content/styles/site-styles.css)
// say what each part looks like in each. A block given a look of its own (a
// cards block's style, a button picked from the set) keeps it - the style
// is the default.
//
// NOTE: src/configs/site-style.ts and site/src/configs/site-style.ts are
// identical - keep them so.

export const SITE_STYLES = ['classic', 'stroke', 'wave', 'neon'] as const
export type SiteStyle = typeof SITE_STYLES[number]

export const SITE_STYLE_PARTS = ['cards', 'buttons', 'footer', 'menu', 'images'] as const
export type SiteStylePart = typeof SITE_STYLE_PARTS[number]
export type SiteStyleParts = Partial<Record<SiteStylePart, SiteStyle>>

export const DEFAULT_SITE_STYLE: SiteStyle = 'classic'

export function resolveSiteStyle (value: unknown): SiteStyle {
  return SITE_STYLES.includes(value as SiteStyle) ? value as SiteStyle : DEFAULT_SITE_STYLE
}

// The style a part actually wears: its own, or the site's.
export function partStyle (siteStyle: unknown, parts: SiteStyleParts | null | undefined, part: SiteStylePart): SiteStyle {
  const own = parts?.[part]
  return SITE_STYLES.includes(own as SiteStyle) ? own as SiteStyle : resolveSiteStyle(siteStyle)
}

export function siteStyleClass (style: SiteStyle): string {
  return `site-style-${style}`
}

// «Хвиля» on the pictures: the edge that waves under the pointer
// (utils/wave-edge.ts) - global.json `siteStyleWaveEdge`, a picture's own
// wave-edge-<side> class over it.
export const WAVE_EDGE_SIDES = ['bottom', 'top', 'left', 'right'] as const
export type WaveEdgeSide = typeof WAVE_EDGE_SIDES[number]
export const DEFAULT_WAVE_EDGE: WaveEdgeSide = 'bottom'

export function resolveWaveEdge (value: unknown): WaveEdgeSide {
  return WAVE_EDGE_SIDES.includes(value as WaveEdgeSide) ? value as WaveEdgeSide : DEFAULT_WAVE_EDGE
}

// «Неон»'s glow: a palette colour (global.json `neonGlow`), as
// --neon-glow for the stylesheets and --neon-glow-theme for the colour
// classes, which read Vuetify's "R,G,B" triples. Unset: gold, the
// stylesheets' own fallback.
export function neonGlowDeclarations (glow: unknown): Record<string, string> | null {
  return typeof glow === 'string' && /^[a-z][\w-]*$/i.test(glow)
    ? { '--neon-glow': `var(--${glow})`, '--neon-glow-theme': `var(--v-theme-${glow})` }
    : null
}

// Puts the classes on an element (the site and the editor: <html>), taking
// the others off; the pictures' wave edge as --site-wave-edge, «Неон»'s
// glow as --neon-glow.
export function applySiteStyle (element: HTMLElement, value: unknown, parts?: SiteStyleParts | null, waveEdge?: unknown, neonGlow?: unknown) {
  const style = resolveSiteStyle(value)
  for (const other of SITE_STYLES) {
    element.classList.toggle(siteStyleClass(other), other === style)
    for (const part of SITE_STYLE_PARTS) {
      element.classList.toggle(`site-style-${part}-${other}`, partStyle(style, parts, part) === other)
    }
  }
  element.style.setProperty('--site-wave-edge', resolveWaveEdge(waveEdge))
  const glow = neonGlowDeclarations(neonGlow)
  for (const name of ['--neon-glow', '--neon-glow-theme']) {
    if (glow) {
      element.style.setProperty(name, glow[name]!)
    } else {
      element.style.removeProperty(name)
    }
  }
}

// The button a style gives a page's button that has none picked: the
// client's first button of that kind in the set (button-set.css writes it
// as button-kind-<kind>), or the kind's starting look. «Класика» keeps the
// site's main button.
export const SITE_STYLE_BUTTON_KIND: Record<SiteStyle, string> = {
  classic: '',
  stroke: 'stroke',
  wave: 'wave',
  neon: 'neon',
}

export function siteStyleButtonClass (value: unknown): string {
  const kind = SITE_STYLE_BUTTON_KIND[resolveSiteStyle(value)]
  return kind ? `button-kind-${kind}` : 'primary-button'
}
