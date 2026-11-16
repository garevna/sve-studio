import { appBase } from '@/utils/app-base'
import { defaultSiteLocale } from '@/utils/locale-text'

declare global {
  interface ImportMetaEnv {
    readonly VITE_SHIP_ORIGIN?: string
  }
}

// The demo ship on an address of its own (dock.pagewright.pp.ua's ship is
// demo.pagewright.pp.ua - site/src/utils/site-source.ts); unset - the ship
// is this app's own <base>site/.
const SHIP_ORIGIN = import.meta.env.VITE_SHIP_ORIGIN || ''

// "Переглянути" opens the site itself (site/ - its own Nuxt app, served at
// <base>site/ by modules/site-app.ts) on this page: the same address a
// visitor would use, so from there the whole site can be walked through -
// menu, links, languages. Address format: site/src/services/site-links.ts
// (the default language has no prefix, the home page no id).
// Where the visitor's ship is: its own address, or this app's <base>site/.
// inFrame: a frame inside the Верф (the header's live preview) - it talks
// to the Верф, so it must be this app's own address.
export function shipBase ({ inFrame = false } = {}): string {
  return SHIP_ORIGIN && !inFrame ? `${SHIP_ORIGIN}/` : `${location.origin}${appBase().replace(/\/$/, '')}/site/`
}

export function pagePreviewUrl (pageId: string | undefined, locale: string, options: { inFrame?: boolean } = {}): string {
  const segments = []
  if (locale && locale !== defaultSiteLocale()) {
    segments.push(locale)
  }
  if (pageId && pageId !== 'home-page') {
    segments.push(encodeURIComponent(pageId))
  }
  // ?preview: opened from the editor - the site then also shows hidden
  // pages (with a note), for the rest of that tab (site/src/App.vue).
  return `${shipBase(options)}${segments.join('/')}?preview`
}

// Tracks a single "preview" window: reloads it while it still shows this
// page (guaranteed fresh load, unlike navigating to an unchanged URL, which
// some browsers no-op), otherwise sends it to the page, or opens a new one
// if it's closed/never existed.
let previewWindow: Window | null = null
const PREVIEW_NAME = 'editor-preview'

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
  // A tab keeps its name through every page it shows: the Верф opened in a
  // tab that once was the preview would open the site over itself - and
  // the Верф would be gone.
  if (window.name === PREVIEW_NAME) {
    window.name = ''
  }
  if (previewHref() === url) {
    previewWindow!.location.reload()
    previewWindow!.focus()
    return
  }
  previewWindow = window.open(url, PREVIEW_NAME)
  previewWindow?.focus()
}

// Best-effort call after any save (page/style/etc.) - a no-op when no
// preview window is open on the site, so wiring this into every save
// handler is purely additive and never pops up an unrequested window.
export function refreshPreviewIfOpen (): void {
  if (previewHref()?.startsWith(location.origin)) {
    previewWindow!.location.reload()
    return
  }
  // the ship on its own address cannot be reloaded from here: it is asked to
  if (SHIP_ORIGIN && previewWindow && !previewWindow.closed) {
    previewWindow.postMessage({ type: 'sve:reload' }, SHIP_ORIGIN)
  }
}
