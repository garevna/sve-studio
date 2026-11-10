import { ref } from 'vue'
import { sveRoot } from './sve-root'

// What went wrong on the site, told to the people who run the deployment -
// never to the visitor's browser console, which stays clean. One entry goes
// to the content API's problem log (/api/log), where a supervisor or an
// owner reads it in the editor ("Журнал").
//
// In the demo the API is the visitor's own browser (the editor's service
// worker), so the visitor is the one to tell: an error is shown at the
// bottom of the screen too (SiteNotice.vue). A warning is only written down.
// The editor has its own copy (src/utils/report.ts).

export type ReportLevel = 'error' | 'warn'

// What SiteNotice.vue shows, newest last.
export const siteNotices = ref<{ id: number, message: string }[]>([])
let nextId = 1

function detailOf (detail: unknown): string | undefined {
  if (detail === undefined || detail === null || detail === '') {
    return undefined
  }
  if (detail instanceof Error) {
    return (detail.stack || `${detail.name}: ${detail.message}`).slice(0, 2000)
  }
  return (typeof detail === 'string' ? detail : String(detail)).slice(0, 2000)
}

// The demo: the in-browser API answers this page.
function inDemo (): boolean {
  return typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller
}

export function report (level: ReportLevel, source: string, message: string, detail?: unknown) {
  const entry = {
    level,
    app: 'site',
    source,
    message,
    detail: detailOf(detail),
    page: typeof location === 'undefined' ? '' : location.pathname,
  }
  // Nothing to post to before the demo's API is up on a static host; in
  // development the dev server answers.
  if (inDemo() || import.meta.env.DEV) {
    void fetch(`${sveRoot()}api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // no keepalive: such a request goes past the demo's service worker
      body: JSON.stringify(entry),
    }).catch(() => {})
  }
  if (level === 'error' && (inDemo() || import.meta.env.DEV)) {
    siteNotices.value = [...siteNotices.value.slice(-2), { id: nextId++, message }]
  }
}

// Everything nobody caught: a script error, a promise nobody waited on, a
// component that threw.
export function reportUncaught (app: { config: { errorHandler?: unknown, warnHandler?: unknown } }) {
  app.config.errorHandler = (error: unknown, _instance: unknown, info: string) => {
    report('error', `vue: ${info}`, error instanceof Error ? error.message : String(error), error)
  }
  app.config.warnHandler = (message: string, _instance: unknown, trace: string) => {
    report('warn', 'vue', message, trace)
  }
  window.addEventListener('error', event => {
    if (!(event instanceof ErrorEvent)) {
      return
    }
    event.preventDefault()
    // The browser's own note that a layout settled a frame late - nothing
    // broke, nothing to tell anyone.
    if (/ResizeObserver loop/.test(event.message)) {
      return
    }
    report('error', 'window', event.message || 'Script error', event.error ?? `${event.filename}:${event.lineno}`)
  })
  window.addEventListener('unhandledrejection', event => {
    event.preventDefault()
    const reason = event.reason as unknown
    report('error', 'promise', reason instanceof Error ? reason.message : String(reason), reason)
  })
}
