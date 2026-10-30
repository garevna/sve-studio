import { appBase } from '@/utils/app-base'
import { defaultSiteLocale } from '@/utils/locale-text'

// "Переглянути" opens the site itself (site/ - its own Nuxt app, served at
// <base>site/ by modules/site-app.ts) on this page: the same address a
// visitor would use, so from there the whole site can be walked through -
// menu, links, languages. Address format: site/src/services/site-links.ts
// (the default language has no prefix, the home page no id).
export function pagePreviewUrl (pageId: string | undefined, locale: string): string {
  const base = appBase().replace(/\/$/, '')
  const segments = []
  if (locale && locale !== defaultSiteLocale()) {
    segments.push(locale)
  }
  if (pageId && pageId !== 'home-page') {
    segments.push(encodeURIComponent(pageId))
  }
  return `${location.origin}${base}/site/${segments.join('/')}`
}

// Tracks a single "preview" window: reloads it if still open (guaranteed
// fresh load, unlike navigating to an unchanged URL, which some browsers
// no-op), or opens a new one if it's closed/never existed.
let previewWindow: Window | null = null

function reloadIfOpen (): boolean {
  if (previewWindow && !previewWindow.closed) {
    previewWindow.location.reload()
    previewWindow.focus()
    return true
  }
  return false
}

// Manual "Переглянути" trigger - opens the window on first use, reloads it
// on every call after that.
export function openPreview (url: string): void {
  if (reloadIfOpen()) {
    return
  }
  previewWindow = window.open(url, 'editor-preview')
}

// Best-effort call after any save (page/style/etc.) - a no-op when no
// preview window is currently open, so wiring this into every save handler
// is purely additive and never pops up an unrequested window.
export function refreshPreviewIfOpen (): void {
  reloadIfOpen()
}
