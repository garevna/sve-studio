// What a CSS custom property actually resolves to, right now, in the
// previewed app's own theme.
//
// The radius controls in the UI Kit name a token (default-border-radius),
// but a designer choosing between them needs to see what each one IS - the
// names alone say nothing about which is bigger. Reading it from the live
// stylesheet rather than keeping a table here means the answer stays correct
// when the token is changed in the palette, with nothing to keep in sync.
const VAR_RE = /^var\(\s*(--[\w-]+)\s*\)$/

// The tokens exist in two spellings: the plain ones from the theme's own
// root.css (--default-border-radius) and Vuetify's scoped copies
// (--v-default-border-radius), which only resolve under a .v-theme--* class.
// Both are tried, starting with whatever was actually asked for.
function readVar (name: string): string {
  const scoped = document.querySelector('.v-theme--appTheme')
  const roots: Element[] = [scoped, document.documentElement].filter(Boolean) as Element[]
  const names = name.startsWith('--v-') ? [name, name.replace('--v-', '--')] : [name, name.replace('--', '--v-')]
  for (const root of roots) {
    const style = getComputedStyle(root)
    for (const candidate of names) {
      const value = style.getPropertyValue(candidate).trim()
      if (value) {
        return value
      }
    }
  }
  return ''
}

/**
 * Resolves `var(--token)` to its computed value ("32px"). Anything that is
 * not a single var() reference - a literal, a four-corner shorthand - is
 * returned unchanged, since it already says what it is.
 */
export function resolveCssVarValue (value?: string): string {
  if (!value) {
    return ''
  }
  const match = value.trim().match(VAR_RE)
  if (!match) {
    return value.trim()
  }
  return readVar(match[1] as string) || value.trim()
}
