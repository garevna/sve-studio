// The content API as one h3 app, ready to mount under /api.
//
// Hosts:
//   - service-worker/content-api-sw.ts - in the browser (the demo): writes
//     go to the visitor's own IndexedDB;
//   - server/api/[...].ts - on the Nitro server: same routes, same
//     middleware, the server's own storage.
// A real backend is this same app with access 'auth': persistent storage in
// nuxt.config.ts, and the caller's token deciding what they may write.
import type { AuthAccessOptions, WriteAccess } from './middleware'
import type { ContentRepository } from './repository'
import { createApp } from 'h3'
import { apiError, defineApiHandler } from './handler'
import { authAccess, contentContext, requestLog, writeAccess } from './middleware'
import { createContentRouter } from './routes'
import { createUsersRouter } from './users-routes'

export interface ContentApiOptions {
  repo: ContentRepository
  access: WriteAccess
  // Required when access is 'auth', unused otherwise.
  auth?: AuthAccessOptions
  log?: boolean
}

// Routes under /api (the host strips nothing - pass the full request).
export function createContentApiHandler ({ repo, access, auth, log = false }: ContentApiOptions) {
  const app = createApp()

  app.use(requestLog(log))
  app.use(contentContext(repo))
  if (access === 'auth') {
    if (!auth) {
      // Better than quietly running wide open, which is what a missing
      // setting would otherwise mean here.
      throw new Error('content api: access "auth" needs auth options')
    }
    app.use(authAccess(auth))
    // Who I am, and who else is here. Only with sign-in on - without it
    // there is no "me" to answer about.
    app.use('/api/users', createUsersRouter(auth).handler)
  } else {
    app.use(writeAccess(access))
  }

  // app.use(prefix, ...) strips the prefix: routes see /pages/home-page.
  app.use('/api/content', createContentRouter().handler)

  // Anything else under /api.
  app.use('/api', defineApiHandler(() => {
    throw apiError(404, 'Not available in this API')
  }))

  return app
}
