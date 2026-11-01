import { shallowRef } from 'vue'

// The site's fonts, all from Google Fonts, all set in global.json:
//   font         - the main font for all text  -> var(--main-font)
//   accentFonts  - any number of extra fonts   -> var(--accent-font),
//                  var(--accent-font-2), ...; a text uses one through the
//                  class of the same name (picked in the text format menu).
//   accentFont   - the older single extra font; read as accentFonts[0].
//
// Fonts are not all built alike: one has a single weight, another a whole
// range of weights (300..800), with or without italics. So a font is stored
// as Google Fonts describes it - "Shantell Sans:ital,wght@0,300..800;1,300..800"
// - and its address asks for exactly that. A bare name ("Montserrat") still
// works: then a common set of weights is asked for and Google skips the
// ones the font doesn't have.
//
// Each font gets its own <link>: Google Fonts answers 400 for an unknown
// family, so one mistyped name must not stop the other fonts from loading.
//
// NOTE: site/src/utils/theme-fonts.ts is an exact copy - keep
// the two identical.

export interface ThemeFontSettings {
  font?: string
  accentFont?: string
  accentFonts?: string[]
}

export interface FontSpec {
  name: string
  // The Google Fonts axes part, e.g. "ital,wght@0,300..800;1,300..800".
  axes: string
}

export interface ThemeFont extends FontSpec {
  // The class a text carries to use this font ('' for the main font).
  className: string
  cssVar: string
}

const DEFAULT_AXES = 'ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700'

// Reads what the user typed or pasted: a plain name, a "family=..." part,
// the whole fonts.googleapis.com address or the <link> code Google gives.
// With several families in one address, the first one is taken.
export function parseFontSpec (value: string | undefined): FontSpec | null {
  let text = (value || '').trim()
  if (!text) {
    return null
  }
  const href = text.match(/href=["']([^"']+)["']/)
  if (href?.[1]) {
    text = href[1]
  }
  text = text.replaceAll('&amp;', '&')
  const family = text.match(/family=([^&"'\s]+)/)
  if (family?.[1]) {
    text = family[1]
  }
  text = text.replaceAll('+', ' ')
  try {
    text = decodeURIComponent(text)
  } catch {
    // Keep the text as it is.
  }
  const colon = text.indexOf(':')
  // Quotes, semicolons and brackets would break out of the CSS value.
  const name = (colon === -1 ? text : text.slice(0, colon)).replace(/["';{}<>]/g, '').trim()
  if (!name) {
    return null
  }
  const axes = colon === -1 ? '' : text.slice(colon + 1).replace(/[^\w,.;@]/g, '')
  return { name, axes }
}

// The form a font is stored in global.json.
export function fontSpecString (spec: FontSpec): string {
  return spec.axes ? `${spec.name}:${spec.axes}` : spec.name
}

export function googleFontUrl (spec: FontSpec): string {
  const family = encodeURIComponent(spec.name).replace(/%20/g, '+')
  return `https://fonts.googleapis.com/css2?family=${family}:${spec.axes || DEFAULT_AXES}&display=swap`
}

export function accentFontsOf (settings: ThemeFontSettings | null | undefined): string[] {
  if (settings?.accentFonts) {
    return settings.accentFonts
  }
  return settings?.accentFont ? [settings.accentFont] : []
}

function accentClass (index: number): string {
  return index === 0 ? 'accent-font' : `accent-font-${index + 1}`
}

// Every font of the site, the main one first.
export function themeFonts (settings: ThemeFontSettings | null | undefined): ThemeFont[] {
  const fonts: ThemeFont[] = []
  const main = parseFontSpec(settings?.font)
  if (main) {
    fonts.push({ ...main, className: '', cssVar: '--main-font' })
  }
  for (const [index, value] of accentFontsOf(settings).entries()) {
    const spec = parseFontSpec(value)
    if (spec) {
      fonts.push({ ...spec, className: accentClass(index), cssVar: `--${accentClass(index)}` })
    }
  }
  return fonts
}

// Is this class one of the font classes (accent-font, accent-font-2, ...)?
export function isFontClass (name: string): boolean {
  return /^accent-font(-\d+)?$/.test(name)
}

// The fonts applied last - the text format menu lists them.
export const appliedThemeFonts = shallowRef<ThemeFont[]>([])

function setFontLink (id: string, spec: FontSpec | null) {
  let link = document.querySelector<HTMLLinkElement>(`#${id}`)
  if (!spec) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.append(link)
  }
  const href = googleFontUrl(spec)
  if (link.href !== href) {
    link.href = href
  }
}

export function applyThemeFonts (settings: ThemeFontSettings | null | undefined) {
  const root = document.documentElement.style
  const fonts = themeFonts(settings)
  appliedThemeFonts.value = fonts

  const main = fonts.find(font => !font.className) ?? null
  setFontLink('theme-font-main', main)
  if (main) {
    root.setProperty('--main-font', `'${main.name}', sans-serif`)
  } else {
    // Falls back to the theme stylesheet's own default (root.css).
    root.removeProperty('--main-font')
  }

  // Extra fonts: a link and a variable each; the ones no longer set go.
  const accents = fonts.filter(font => font.className)
  const keep = new Set(accents.map(font => `theme-font-${font.className}`))
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[id^="theme-font-accent"]')) {
    if (!keep.has(link.id)) {
      link.remove()
    }
  }
  for (const property of [...root].filter(name => name.startsWith('--accent-font'))) {
    if (!accents.some(font => font.cssVar === property)) {
      root.removeProperty(property)
    }
  }
  for (const font of accents) {
    setFontLink(`theme-font-${font.className}`, font)
    root.setProperty(font.cssVar, `'${font.name}', var(--main-font)`)
  }

  // The class rule of the first extra font is in the theme stylesheet
  // (typographics.css); the others get theirs here.
  let style = document.querySelector<HTMLStyleElement>('#theme-font-classes')
  if (!style) {
    style = document.createElement('style')
    style.id = 'theme-font-classes'
    document.head.append(style)
  }
  style.textContent = accents
    .filter(font => font.className !== 'accent-font')
    .map(font => `.${font.className}, .${font.className} * { font-family: var(${font.cssVar}, var(--main-font)) !important; }`)
    .join('\n')
}
