// The site's two fonts, both from Google Fonts and both set in global.json:
//   font        - the main font for all text  -> var(--main-font)
//   accentFont  - an optional second font     -> var(--accent-font),
//                 used by texts that carry the `accent-font` class
//
// Each font gets its own <link>: Google Fonts answers 400 for an unknown
// family, so one mistyped name must not stop the other font from loading.
// Missing weights/italics are fine - Google silently skips them.
//
// NOTE: site/src/utils/theme-fonts.ts is an exact copy - keep
// the two identical.

export interface ThemeFontSettings {
  font?: string
  accentFont?: string
}

const STYLES = 'ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700'

function cleanName (name: string | undefined): string {
  // Quotes and semicolons would break out of the CSS value below.
  return (name || '').replace(/["';{}]/g, '').trim()
}

export function googleFontUrl (name: string): string {
  const family = encodeURIComponent(cleanName(name)).replace(/%20/g, '+')
  return `https://fonts.googleapis.com/css2?family=${family}:${STYLES}&display=swap`
}

function setFontLink (id: string, name: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!name) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.append(link)
  }
  const href = googleFontUrl(name)
  if (link.href !== href) {
    link.href = href
  }
}

export function applyThemeFonts (settings: ThemeFontSettings | null | undefined) {
  const root = document.documentElement.style
  const main = cleanName(settings?.font)
  const accent = cleanName(settings?.accentFont)

  setFontLink('theme-font-main', main)
  if (main) {
    root.setProperty('--main-font', `'${main}', sans-serif`)
  } else {
    // Falls back to the theme stylesheet's own default (root.css).
    root.removeProperty('--main-font')
  }

  setFontLink('theme-font-accent', accent)
  if (accent) {
    root.setProperty('--accent-font', `'${accent}', var(--main-font)`)
  } else {
    root.removeProperty('--accent-font')
  }
}
