// Middleware of the content API. In h3 a middleware is an event handler that
// returns nothing - the request then continues to the routes.
import type { EditorRoleModel } from '../../src/configs/editor-roles'
import type { Caller } from './caller'
import type { ContentRepository } from './repository'
import type { UsersStore } from './users'
import { defineEventHandler, getHeader, getMethod, getRequestURL } from 'h3'
import { mayWriteContent } from '../../src/configs/editor-roles'
import { callerOf } from './caller'
import { NO_ROLE, remember, roleOf } from './users'

// Puts the repository for this runtime on the event (see handler.ts). Each
// host - the service worker, the Nitro server - passes its own.
export function contentContext (repo: ContentRepository) {
  return defineEventHandler(event => {
    event.context.contentRepo = repo
  })
}

// Who may write.
//   'open'      - the in-browser demo: every visitor edits their own private
//                 copy, so there is nobody to protect them from;
//   'read-only' - a shared server with no sign-in, so one visitor's edits
//                 can never reach another;
//   'auth'      - a real deployment: the caller's token decides, per path.
export type WriteAccess = 'open' | 'read-only' | 'auth'

export function writeAccess (mode: Exclude<WriteAccess, 'auth'>) {
  return defineEventHandler(event => {
    event.context.contentWritable = mode === 'open'
  })
}

export type CallerRole = EditorRoleModel | typeof NO_ROLE | 'owner'

export interface AuthAccessOptions {
  projectId: string
  owners: string
  users: UsersStore
  // Pulled out so the rule can be tested without Google's keys.
  resolve?: (authorization: string, projectId: string) => Promise<Caller | null>
}

// The token check the comment above used to promise. It answers the same
// single question - `contentWritable` - so every route stays exactly as it
// is; what changes is that the answer now depends on who is asking and on
// what they are reaching for (src/configs/editor-roles.ts, the same lists
// that decide which buttons they see).
//
// Reading is deliberately not gated. A site's content is public the moment
// it is published, and a login wall in front of GET would make the editor
// slower without making anything private.
export function authAccess ({ projectId, owners, users, resolve = callerOf }: AuthAccessOptions) {
  return defineEventHandler(async event => {
    event.context.contentWritable = false
    const caller = await resolve(getHeader(event, 'authorization') || '', projectId)
    if (!caller) {
      return
    }
    // Everyone who signs in is recorded - that is how a new person appears
    // in the list to be given a role, without anybody typing a user id.
    const stored = await remember(users, caller)
    const role: CallerRole = roleOf(caller, stored, owners)
    event.context.caller = { ...caller, role }
    if (role === 'owner') {
      event.context.contentWritable = true
      return
    }
    if (role === NO_ROLE) {
      return
    }
    // The path as the routes see it, without the mount prefix.
    const path = getRequestURL(event).pathname.replace(/^\/api\/content/, '')
    event.context.contentWritable = mayWriteContent(role, path)
  })
}

// One line per request in development.
export function requestLog (enabled: boolean) {
  return defineEventHandler(event => {
    if (enabled) {
      console.debug(`[content-api] ${getMethod(event)} ${getRequestURL(event).pathname}`)
    }
  })
}
