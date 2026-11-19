// The site's style - «Класика», «Штрих», «Хвиля» or «Неон» - one look for the whole
// site, kept in global.json `siteStyle`. A client who likes some of one and
// some of another mixes them: each part of the site (cards, buttons,
// footer, menu...) can take a style of its own (`siteStyleParts`), or, left
// unset, the site's. Chosen with the «Стиль» button of the page editor.
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

export const SITE_STYLE_PARTS = ['cards', 'buttons', 'footer', 'menu'] as const
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

// Puts the classes on an element (the site and the editor: <html>), taking
// the others off.
export function applySiteStyle (element: Element, value: unknown, parts?: SiteStyleParts | null) {
  const style = resolveSiteStyle(value)
  for (const other of SITE_STYLES) {
    element.classList.toggle(siteStyleClass(other), other === style)
    for (const part of SITE_STYLE_PARTS) {
      element.classList.toggle(`site-style-${part}-${other}`, partStyle(style, parts, part) === other)
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
