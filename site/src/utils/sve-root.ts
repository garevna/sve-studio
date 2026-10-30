// Where the whole demo lives: the site is served at <root>site/, the editor
// and everything both share (the content API worker, the starting content
// at <root>_seed/, the icons) at <root> - "/" in dev, "/sve-studio/" on
// GitHub Pages.
export function sveRoot (): string {
  const nuxtBase = (globalThis as { __NUXT__?: { config?: { app?: { baseURL?: string } } } }).__NUXT__?.config?.app?.baseURL ?? '/site/'
  const base = nuxtBase.endsWith('/') ? nuxtBase : `${nuxtBase}/`
  return base.replace(/site\/$/, '')
}
