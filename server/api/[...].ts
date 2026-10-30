// Mounts the content API (server/content-api) on the Nitro server at /api.
//
// In the demo the browser's service worker answers /api first, so this is
// the fallback - and it is read-only (runtimeConfig.contentApi.access), so
// no visitor's edits ever land in storage shared with others. With a real
// backend: access 'open' behind real auth, persistent storage in
// nuxt.config.ts - the routes stay as they are.
import type { WriteAccess } from '../content-api/middleware'
import { createContentApiHandler } from '../content-api/app'

let handler: ReturnType<typeof createContentApiHandler>['handler'] | null = null

export default defineEventHandler(event => {
  handler ??= createContentApiHandler({
    repo: useContentRepository(),
    access: useRuntimeConfig().contentApi.access as WriteAccess,
    log: import.meta.dev,
  }).handler
  return handler(event)
})
