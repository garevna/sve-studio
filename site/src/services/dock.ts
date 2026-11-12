import type { ClientApiDocument, DockContext } from '@sve/dock'
import { createDock, DockError } from '@sve/dock'
import { reactive, ref } from 'vue'
import { report } from '../utils/report'
import { sveRoot } from '../utils/sve-root'

// The site's side of the docking block (packages/dock): the client's API
// settings (content/settings/client-api.json, read once with the site's
// other settings - App.vue), and the values the visitor has filled in,
// by field key.
//
// The values outlive a page: a search started on the home page and
// finished on another one still knows the dates. Kept for the tab's life
// (sessionStorage), not longer - a booking search from last week is no help.

const STORAGE_KEY = 'pw-dock-values'

const documentRef = ref<ClientApiDocument | null>(null)

function restore (): Record<string, unknown> {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export const dockValues = reactive<Record<string, unknown>>(typeof sessionStorage === 'undefined' ? {} : restore())

export function setDockValue (key: string, value: unknown) {
  dockValues[key] = value
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dockValues))
  } catch {
    // a private window without storage: the values live as long as the page
  }
}

export function setClientApiDocument (document: ClientApiDocument | null) {
  documentRef.value = document
  dock.forget()
}

export const dock = createDock({
  document: () => documentRef.value,
  // The demo's test API lives at the site's own root; a client's real API
  // is given with its own base address.
  root: () => new URL(sveRoot(), typeof location === 'undefined' ? 'http://localhost/' : location.origin).toString(),
})

export function dockRequests () {
  return documentRef.value?.requests ?? []
}

// What a request is built from right now.
export function dockContext (locale: string, extra: Partial<DockContext['system']> = {}): DockContext {
  const origin = typeof location === 'undefined' ? '' : location.origin
  return {
    values: { ...dockValues },
    system: {
      locale,
      page: typeof location === 'undefined' ? '' : location.href,
      // the site's home page in this language
      return: `${origin}${sveRoot()}site/${locale === 'uk' ? '' : `${locale}/`}`,
      ...extra,
    },
  }
}

// Tells the people running the site; the visitor sees the block's own short
// message, never the details.
export function reportDock (what: string, error: unknown) {
  report('error', 'dock', `${what}: ${error instanceof Error ? error.message : String(error)}`, error instanceof DockError ? error.detail : error)
}
