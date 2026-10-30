// The shared content API's own origin - NOT necessarily the same as
// location.origin. In prod they coincide (this app deploys at the API's own
// domain root). In local dev they don't: the dev server runs on
// localhost:<port> while VITE_API_URL points at the real dev API
// (the client's dev backend) - confirmed live, image/page/settings URLs
// built from location.origin instead of this were 404ing locally. Anything
// that resolves a path under /api/... (image URLs included) must use this,
// not location.origin.
declare global {
  interface ImportMetaEnv {
    PROD: boolean
    readonly VITE_API_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

// No window on a server: there the API lives on the site's own origin,
// and a domain-relative path is what the page should carry anyway.
const pageOrigin = typeof location === 'undefined' ? 'http://localhost' : location.origin
export const CONTENT_API_BASE = import.meta.env.PROD ? `${pageOrigin}/api` : import.meta.env.VITE_API_URL || ''
export const CONTENT_API_ORIGIN = typeof location === 'undefined' ? '' : new URL(CONTENT_API_BASE, pageOrigin).origin
