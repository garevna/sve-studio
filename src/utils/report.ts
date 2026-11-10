import { appBase } from '@/utils/app-base'

// What went wrong, told to the people who run the deployment - never to the
// browser console, which stays clean. One entry goes to the content API's
// problem log (/api/log, server/content-api/log-routes.ts), where a
// supervisor or an owner reads it (the editor's "Журнал" section).
//
// In the demo the log is the visitor's own (the in-browser API keeps it),
// and the visitor is the one to tell: an error is shown in a snackbar too.
// Where no API answers at all, the snackbar is all there is. A warning is
// only written down - it is for whoever reads the log, not a reason to
// interrupt anyone.
//
// The site has its own copy (site/src/utils/report.ts).

export type ReportLevel = 'error' | 'warn'

type Target = 'server' | 'service-worker' | 'local'

interface Entry {
  level: ReportLevel
  app: 'editor'
  source: string
  message: string
  detail?: string
  page: string
  // already said on screen - no second snackbar
  shown?: boolean
}

let target: Target | null = null
// Reports made before the editor knows which API it has
// (app/plugins/01.content-api.client.ts) wait here.
const waiting: Entry[] = []
let notice: ((message: string, detail?: string) => void) | null = null
// errors to show once there is a way to show them
const unshown: { message: string, detail?: string }[] = []

function detailOf (detail: unknown): string | undefined {
  if (detail === undefined || detail === null || detail === '') {
    return undefined
  }
  if (detail instanceof Error) {
    return (detail.stack || `${detail.name}: ${detail.message}`).slice(0, 2000)
  }
  if (typeof detail === 'string') {
    return detail.slice(0, 2000)
  }
  try {
    return JSON.stringify(detail).slice(0, 2000)
  } catch {
    return String(detail).slice(0, 2000)
  }
}

function deliver (entry: Entry) {
  if (target !== 'local') {
    void fetch(`${appBase()}api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, shown: undefined }),
      // Survives the page closing - but such a request goes past a
      // service worker, so only to a real server.
      keepalive: target === 'server',
    }).catch(() => {})
  }
  if (target !== 'server' && entry.level === 'error' && !entry.shown) {
    notice?.(entry.message, entry.detail?.split('\n')[0])
  }
}

export function report (level: ReportLevel, source: string, message: string, detail?: unknown, options: { shown?: boolean } = {}) {
  const entry: Entry = {
    level,
    app: 'editor',
    source,
    message,
    detail: detailOf(detail),
    page: typeof location === 'undefined' ? '' : location.pathname,
    shown: options.shown,
  }
  if (target === null) {
    waiting.push(entry)
    return
  }
  deliver(entry)
}

// Which API answers - from app/plugins/01.content-api.client.ts.
export function setReportTarget (value: Target) {
  target = value
  for (const entry of waiting.splice(0)) {
    deliver(entry)
  }
}

// How an error is shown in the demo (the editor's snackbar).
export function setReportNotice (show: (message: string, detail?: string) => void) {
  notice = show
  for (const item of unshown.splice(0)) {
    show(item.message, item.detail)
  }
}

// Everything nobody caught: a script error, a promise nobody waited on, a
// component that threw. Reported, and kept out of the console.
export function reportUncaught (app: { config: { errorHandler?: unknown, warnHandler?: unknown } }) {
  app.config.errorHandler = (error: unknown, _instance: unknown, info: string) => {
    report('error', `vue: ${info}`, error instanceof Error ? error.message : String(error), error)
  }
  app.config.warnHandler = (message: string, _instance: unknown, trace: string) => {
    report('warn', 'vue', message, trace)
  }
  window.addEventListener('error', event => {
    // a picture or a stylesheet that did not load is not a script error
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
