import { REMOTE_API_DISABLED } from '@/configs/api-mode'
import { appBase } from '@/utils/app-base'

/**
 * dynamic-pages JSON stores image/icon paths the way the real (single-theme)
 * production app serves them - "/images/about-company/01.jpg" or
 * "/icons/bus-park/01.svg". This editor's own public/ layout is per-theme
 * ("/images/theme_2/...", "/icons/theme_2/..."), so raw paths need the theme
 * segment inserted before they'll actually resolve. mdi- icon names, data:
 * URLs, and freshly-uploaded assets (see upload-image.ts, which stores full
 * absolute URLs - already resolved, never matches the leading-slash pattern
 * below) are all left untouched.
 */
// The content API's own origin. Same rule ajax.ts's axios instance uses for
// its baseURL: the API lives at the domain root's /api in production, and at
// VITE_API_URL in dev - NOT under this editor's own deploy sub-path.
// Derived here rather than read from the store so a plain utility doesn't
// have to reach into Pinia (and risk an import cycle) just to build a URL.
function apiOrigin (): string {
  // Demo: the API is the in-browser mock on this same origin.
  if (REMOTE_API_DISABLED || import.meta.env.PROD) {
    return location.origin
  }
  const configured = import.meta.env.VITE_API_URL
  return configured ? new URL(configured, location.origin).origin : location.origin
}

export function resolveThemeAssetPath (path: string | undefined, theme: number): string {
  if (!path || path.startsWith('data:')) {
    return path || ''
  }

  // An uploaded asset's own path (/api/content/images/{hash}.ext) is
  // domain-relative to the CONTENT API's origin, not to this app's. Leaving
  // it alone - which this function used to do, on the assumption that
  // ajaxStore.getImageURL() would finish the job downstream - meant it
  // resolved against wherever the editor itself happens to be served from.
  // In dev that's localhost:3000, so every uploaded image 404'd and simply
  // vanished from the page. Only some callers chained the two functions;
  // the parallax, nested sections, image blocks and card icons never did.
  // Resolving it here instead means there is one rule and nothing to
  // remember: this function always returns something directly usable as a
  // src. Idempotent, so the callers that DO also call getImageURL stay
  // correct (an absolute URL returns at the top).
  if (path.startsWith('/api/')) {
    // The demo's API answers under the app's base (see ajax.ts).
    return apiOrigin() + (REMOTE_API_DISABLED || import.meta.env.PROD ? appBase().replace(/\/$/, '') : '') + path
  }

  // Only the legacy "/images/..."/"/icons/..." shape needs the theme
  // segment + this app's own base folded in - those are served by this
  // app's own public/ folder (vite.config.mts builds with
  // base:"/visual-editor/" in prod), so a root-relative path like that
  // 404s on any deployment not served from the domain root. Everything
  // else - blob:/http(s)/an mdi- name - is left untouched.
  if (!/^\/(images|icons)\//.test(path)) {
    return path
  }

  const themed = path.replace(/^\/(images|icons)\//, `/$1/theme_${theme}/`)
  const base = appBase().replace(/\/$/, '')
  return base + themed
}
