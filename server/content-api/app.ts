import type { Storage } from 'unstorage'
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
import { createLogRouter } from './log-routes'
import { authAccess, contentContext, requestLog, writeAccess } from './middleware'
import { createContentRouter } from './routes'
import { createUsersRouter } from './users-routes'

export interface ContentApiOptions {
  repo: ContentRepository
  access: WriteAccess
  // Required when access is 'auth', unused otherwise.
  auth?: AuthAccessOptions
  log?: boolean
  // Where /api/log keeps what went wrong (log-routes.ts). Without it a
  // report is accepted and dropped.
  logs?: Storage
}

// Routes under /api (the host strips nothing - pass the full request).
export function createContentApiHandler ({ repo, access, auth, log = false, logs }: ContentApiOptions) {
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
    // No sign-in here: "me" is nobody, and the editor keeps the role it is
    // told in the interface (src/services/editor-users.ts). An answer, not
    // a 404 - a 404 would be a red line in every visitor's console.
    app.use('/api/users/me', defineApiHandler(() => ({ signIn: false })))
  }

  // What went wrong in the editor or on the site (log-routes.ts).
  app.use('/api/log', createLogRouter(logs, access).handler)

  // app.use(prefix, ...) strips the prefix: routes see /pages/home-page.
  app.use('/api/content', createContentRouter().handler)

  // Anything else under /api.
  app.use('/api', defineApiHandler(() => {
    throw apiError(404, 'Not available in this API')
  }))

  return app
}
