// Shared message shapes between src/db/client.ts (main thread) and
// src/db/worker.ts. `id` is an implementation detail for promise
// correlation - every route/action pair the app calls with stays exactly
// { route, action, data }.
export interface DbRequestMessage {
  id: number
  route: string
  action: string
  data?: unknown
}

export interface DbResponseMessage {
  id: number
  route: string
  action: string
  data?: unknown
  error?: string
  // id 0: not an answer - a problem the worker met, for the page to report
  // (utils/report.ts); a worker has no console the page's people read.
  log?: { level: 'error' | 'warn', message: string, detail?: string }
}
