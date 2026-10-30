// The content API as one h3 app, ready to mount under /api.
//
// Hosts:
//   - service-worker/content-api-sw.ts - in the browser (the demo): writes
//     go to the visitor's own IndexedDB;
//   - server/api/[...].ts - on the Nitro server: same routes, same
//     middleware, the server's own storage.
// Moving to a real backend = serving it from Nitro with persistent storage
// and real auth in place of `writeAccess`.
import type { WriteAccess } from './middleware'
import type { ContentRepository } from './repository'
import { createApp, createRouter, defineEventHandler } from 'h3'
import { apiError, defineApiHandler } from './handler'
import { contentContext, requestLog, writeAccess } from './middleware'
import { createContentRouter } from './routes'

export interface ContentApiOptions {
  repo: ContentRepository
  access: WriteAccess
  log?: boolean
}

// Routes under /api (the host strips nothing - pass the full request).
export function createContentApiHandler ({ repo, access, log = false }: ContentApiOptions) {
  const app = createApp()

  app.use(requestLog(log))
  app.use(contentContext(repo))
  app.use(writeAccess(access))

  // app.use(prefix, ...) strips the prefix: routes see /pages/home-page.
  app.use('/api/content', createContentRouter().handler)

  // The hero's banner carousel comes from a separate finance API on the
  // client's backend. The demo has no banners - the hero shows the site's
  // own picture instead.
  const extra = createRouter()
  extra.get('/finance/banners', defineEventHandler(() => ({ images: [] })))
  app.use('/api', extra.handler)

  // Anything else under /api.
  app.use('/api', defineApiHandler(() => {
    throw apiError(404, 'Not available in this API')
  }))

  return app
}
