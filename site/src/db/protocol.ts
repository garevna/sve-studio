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
}
