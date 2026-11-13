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
  // ?preview: opened from the editor - the site then also shows hidden
  // pages (with a note), for the rest of that tab (site/src/App.vue).
  return `${location.origin}${base}/site/${segments.join('/')}?preview`
}

// Tracks a single "preview" window: reloads it while it still shows this
// page (guaranteed fresh load, unlike navigating to an unchanged URL, which
// some browsers no-op), otherwise sends it to the page, or opens a new one
// if it's closed/never existed.
let previewWindow: Window | null = null

// Where the preview window is now - null when it is closed or has left for
// another origin (a docking form hands the visitor over to the client's
// «Прийом запитів»): such a window may be navigated, never read or reloaded.
function previewHref (): string | null {
  if (!previewWindow || previewWindow.closed) {
    return null
  }
  try {
    return previewWindow.location.href
  } catch {
    return null
  }
}

// Manual "Переглянути" trigger - opens the window on first use; after that
// reloads it if it shows this very page, else brings it back to the page.
export function openPreview (url: string): void {
  if (previewHref() === url) {
    previewWindow!.location.reload()
    previewWindow!.focus()
    return
  }
  previewWindow = window.open(url, 'editor-preview')
  previewWindow?.focus()
}

// Best-effort call after any save (page/style/etc.) - a no-op when no
// preview window is open on the site, so wiring this into every save
// handler is purely additive and never pops up an unrequested window.
export function refreshPreviewIfOpen (): void {
  if (previewHref()?.startsWith(location.origin)) {
    previewWindow!.location.reload()
  }
}
