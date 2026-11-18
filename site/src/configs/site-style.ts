// The site's style - one look for its cards, buttons, footer (and, as they
// come, other parts): «Класика», «Штрих» or «Хвиля». Chosen in the UI Kit,
// kept in global.json `siteStyle`. The site wears it as a class on <html>
// (site-style-<id>); the UI Kit's stylesheets say what each part looks like
// under it. A part given a look of its own (a cards block's style, a
// button picked from the set) keeps that look - the style is the default.
//
// NOTE: src/configs/site-style.ts and site/src/configs/site-style.ts are
// identical - keep them so.

export const SITE_STYLES = ['classic', 'stroke', 'wave'] as const
export type SiteStyle = typeof SITE_STYLES[number]

export const DEFAULT_SITE_STYLE: SiteStyle = 'classic'

export function resolveSiteStyle (value: unknown): SiteStyle {
  return SITE_STYLES.includes(value as SiteStyle) ? value as SiteStyle : DEFAULT_SITE_STYLE
}

export function siteStyleClass (style: SiteStyle): string {
  return `site-style-${style}`
}

// Puts the style's class on an element (the site: <html>; the editor: the
// page canvas), taking the other styles' off.
export function applySiteStyle (element: Element, value: unknown) {
  const style = resolveSiteStyle(value)
  for (const other of SITE_STYLES) {
    element.classList.toggle(siteStyleClass(other), other === style)
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
}

export function siteStyleButtonClass (value: unknown): string {
  const kind = SITE_STYLE_BUTTON_KIND[resolveSiteStyle(value)]
  return kind ? `button-kind-${kind}` : 'primary-button'
}
