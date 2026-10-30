// Addresses of the site's pages, and where a link stored in the content
// leads.
//
//   /site/                  - home page, in the site's default language
//   /site/about-company     - a page
//   /site/en/about-company  - the same page in another language
//
// The page's id is its address (the "id" of its JSON). The default language
// has no prefix, so the plain addresses stay short.

export const HOME_PAGE_ID = 'home-page'

// Parts of the original booking site the demo does not have (accounts,
// trips); a link to one of them is not shown at all.
const MISSING_ROUTES = new Set(['user-dashboard', 'sign-in', 'sign-up', 'auth', 'buyer', 'direct-trip', 'back-trip', 'direct-route-variants', 'back-route-variants'])

export type LinkSource = {
  route?: string
  params?: object
  hash?: string
}

export function sitePath (pageId: string, locale: string, defaultLocale: string, hash = ''): string {
  const segments = []
  if (locale !== defaultLocale) {
    segments.push(locale)
  }
  if (pageId !== HOME_PAGE_ID) {
    segments.push(pageId)
  }
  return `/${segments.join('/')}${hash}`
}

// What the address says: the language (when it is one of the site's) and
// the page.
export function parseSitePath (segments: string[], locales: string[], defaultLocale: string): { locale: string, pageId: string } {
  const parts = segments.filter(Boolean)
  let locale = defaultLocale
  // The default language written out (/site/uk/...) is accepted too.
  if (parts.length > 0 && locales.includes(parts[0]!)) {
    locale = parts.shift()!
  }
  return { locale, pageId: parts[0] || HOME_PAGE_ID }
}

// The page a stored link points at, or null when it leads nowhere on this
// site. The editor writes { route: 'dynamic-page', params: { pageId } };
// older content has the page id itself as `route`.
export function linkedPageId (source: LinkSource): string | null {
  const route = source.route
  if (!route) {
    return null
  }
  if (route === 'dynamic-page') {
    return (source.params as { pageId?: string } | undefined)?.pageId || null
  }
  if (route === 'home' || route === 'main') {
    return HOME_PAGE_ID
  }
  return MISSING_ROUTES.has(route) ? null : route
}

export function isMissingRoute (source: LinkSource): boolean {
  return !!source.route && linkedPageId(source) === null
}
