// Mounts the content API (server/content-api) on the Nitro server at /api.
//
// In the demo the browser's service worker answers /api first, so this is
// the fallback - and it is read-only (runtimeConfig.contentApi.access), so
// no visitor's edits ever land in storage shared with others.
//
// A real deployment sets NUXT_CONTENT_API_ACCESS=auth: then the caller's
// Firebase token decides what they may write, per path, from the same role
// lists the editor's home screen is built from. It also needs
// NUXT_CONTENT_API_OWNERS - without owners nobody can give anybody a role,
// and the editor is a read-only window for everyone including you.
import type { WriteAccess } from '../content-api/middleware'
import type { UsersStore } from '../content-api/users'
import { createContentApiHandler } from '../content-api/app'

let handler: ReturnType<typeof createContentApiHandler>['handler'] | null = null

export default defineEventHandler(event => {
  if (!handler) {
    const config = useRuntimeConfig()
    const access = config.contentApi.access as WriteAccess
    handler = createContentApiHandler({
      repo: useContentRepository(),
      access,
      auth: access === 'auth'
        ? {
            projectId: String(config.contentApi.firebaseProjectId || ''),
            owners: String(config.contentApi.owners || ''),
            users: useStorage('content-users') as unknown as UsersStore,
          }
        : undefined,
      log: import.meta.dev,
      logs: useStorage('content-log'),
    }).handler
  }
  return handler(event)
})
