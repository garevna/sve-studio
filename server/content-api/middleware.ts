// Middleware of the content API. In h3 a middleware is an event handler that
// returns nothing - the request then continues to the routes.
import type { ContentRepository } from './repository'
import { defineEventHandler, getMethod, getRequestURL } from 'h3'

// Puts the repository for this runtime on the event (see handler.ts). Each
// host - the service worker, the Nitro server - passes its own.
export function contentContext (repo: ContentRepository) {
  return defineEventHandler(event => {
    event.context.contentRepo = repo
  })
}

// Who may write. Today: 'open' (the in-browser demo - every visitor has
// their own private copy) or 'read-only' (the shared server, so one
// visitor's edits never reach another). A real backend replaces this with a
// token check - nothing else changes.
export type WriteAccess = 'open' | 'read-only'

export function writeAccess (mode: WriteAccess) {
  return defineEventHandler(event => {
    event.context.contentWritable = mode === 'open'
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
