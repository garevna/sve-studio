// Where the whole demo lives: the site is served at <root>site/, the editor
// and everything both share (the content API worker, the starting content
// at <root>_seed/, the icons) at <root> - "/" in dev and on
// dock.pagewright.pp.ua, "/sve-studio/" on GitHub Pages. The owner's own site
// (utils/published.ts) is its own root: its base has no "site/".
export function sveRoot (): string {
  return siteBase().replace(/site\/$/, '')
}

// The site's own address: <root>site/, or the owner's site's root.
export function siteBase (): string {
  const nuxtBase = (globalThis as { __NUXT__?: { config?: { app?: { baseURL?: string } } } }).__NUXT__?.config?.app?.baseURL ?? '/site/'
  return nuxtBase.endsWith('/') ? nuxtBase : `${nuxtBase}/`
}
