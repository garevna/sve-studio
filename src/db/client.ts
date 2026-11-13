import type { DbRequestMessage, DbResponseMessage } from './protocol'
import { getActiveTheme } from '@/utils/active-theme'
import { appBase } from '@/utils/app-base'
import { report } from '@/utils/report'

// Plain module, not a Pinia store - main.ts needs to read palette/settings/
// CSS text before Pinia (or the Vue app) exists at all, so this has to be
// importable from both a pre-bootstrap context and later from Pinia stores/
// components, sharing the same worker connection either way.

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void }>()
let initPromise: Promise<void> | null = null

function getWorker (): Worker {
  if (worker) {
    return worker
  }

  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<DbResponseMessage>) => {
    if (event.data.log) {
      const { level, message, detail } = event.data.log
      report(level, 'db-worker', message, detail)
      return
    }
    const { id, error, data } = event.data
    const entry = pending.get(id)
    if (!entry) {
      return
    }
    pending.delete(id)
    if (error) {
      entry.reject(new Error(error))
    } else {
      entry.resolve(data)
    }
  }
  worker.onerror = event => {
    const error = new Error(event.message || 'DB worker crashed')
    for (const entry of pending.values()) {
      entry.reject(error)
    }
    pending.clear()
  }
  return worker
}

function send<T> (route: string, action: string, data?: unknown): Promise<T> {
  const id = nextId++
  // Callers often pass Vue-reactive state straight through (e.g. a page's
  // dynamicPageContent) - structured clone (what postMessage uses under the
  // hood) can choke on a reactive Proxy even though its target is a plain
  // object, so round-trip through JSON first to guarantee a plain,
  // cloneable payload. Page/settings/style content is JSON-shaped data
  // already, so this is lossless for everything this client actually sends.
  const plainData = data === undefined ? undefined : JSON.parse(JSON.stringify(data))
  const message: DbRequestMessage = { id, route, action, data: plainData }
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
    try {
      getWorker().postMessage(message)
    } catch (error) {
      pending.delete(id)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

// Files the first-run seed had to skip (listed in manifest.json but missing
// or broken). The app registers a handler that shows them to the user;
// until it does, they wait here.
let seedProblemHandler: ((files: string[]) => void) | null = null
let pendingSeedProblems: string[] | null = null

function reportSeedProblems (files: string[]) {
  if (seedProblemHandler) {
    seedProblemHandler(files)
  } else {
    pendingSeedProblems = files
  }
}

export function onSeedProblems (handler: (files: string[]) => void) {
  seedProblemHandler = handler
  if (pendingSeedProblems) {
    handler(pendingSeedProblems)
    pendingSeedProblems = null
  }
}

function ensureInit (): Promise<void> {
  if (!initPromise) {
    const theme = getActiveTheme()
    initPromise = send<{ skipped?: string[] }>('db', 'init', { theme, base: appBase() }).then(result => {
      if (result?.skipped?.length) {
        reportSeedProblems(result.skipped)
      }
    })
  }
  return initPromise
}

// The one function every other layer (ajaxStore, main.ts, StyleFileView.vue)
// calls through - transparently ensures the worker + IndexedDB are open
// (and seeded) before the first real request goes out.
export async function dbRequest<T> (route: string, action: string, data?: unknown): Promise<T> {
  await ensureInit()
  return send<T>(route, action, data)
}
