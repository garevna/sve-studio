// defineApiHandler - the one way content API routes are written.
//
// A thin wrapper over h3's defineEventHandler that
//   - hands the route the content repository (put on the event by the
//     `contentContext` middleware for whichever runtime is serving), so a
//     route never knows whether it runs in Nitro or in the browser;
//   - turns any failure into the API's error format: an HTTP status and
//     { "error": "human-readable message" } (docs/api-requirements.md).
import type { H3Event } from 'h3'
import type { ContentRepository } from './repository'
import { createError, defineEventHandler, getRouterParam, isError, setResponseStatus, toWebRequest } from 'h3'

export interface ApiContext {
  repo: ContentRepository
}

declare module 'h3' {
  interface H3EventContext {
    contentRepo?: ContentRepository
    // Set by the auth middleware; false in the read-only server mode.
    contentWritable?: boolean
  }
}

export function defineApiHandler<T> (handler: (event: H3Event, context: ApiContext) => T | Promise<T>) {
  return defineEventHandler(async event => {
    const repo = event.context.contentRepo
    if (!repo) {
      throw apiError(500, 'Content storage is not configured')
    }
    try {
      return await handler(event, { repo })
    } catch (error) {
      if (isError(error)) {
        setResponseStatus(event, error.statusCode)
        // `code` is there when the refusal has a name of its own - the
        // editor shows a different sentence for each (see apiError).
        const named = (error.data as { code?: string } | undefined)?.code
        const answer = { error: error.statusMessage || error.message }
        return named ? { ...answer, code: named } : answer
      }
      console.error('[content-api]', error)
      setResponseStatus(event, 500)
      return { error: error instanceof Error ? error.message : String(error) }
    }
  })
}

// `code` names the refusal for the caller: the status alone cannot tell
// "you may not" from "nobody may change their own role", and both are 403
// or 409 with a sentence that only a human reads.
export function apiError (statusCode: number, message: string, code?: string) {
  return createError({ statusCode, statusMessage: message, data: code ? { code } : undefined })
}

// --- request helpers -------------------------------------------------------

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i
const FILE_NAME = /^[\w.-]+$/
const IMAGE_PATH = /^[\w-]+(?:\.[\w-]+)*(?:\/[\w-]+(?:\.[\w-]+)*)*$/

export function slugParam (event: H3Event, name = 'slug'): string {
  const value = decodeURIComponent(getRouterParam(event, name) ?? '')
  if (!SLUG.test(value)) {
    throw apiError(400, `Invalid ${name}: "${value}"`)
  }
  return value
}

// Styles are addressed with or without ".css" - the same file either way.
export function styleNameParam (event: H3Event): string {
  const value = decodeURIComponent(getRouterParam(event, 'name') ?? '')
  if (!FILE_NAME.test(value)) {
    throw apiError(400, `Invalid style name: "${value}"`)
  }
  return value.endsWith('.css') ? value : `${value}.css`
}

// "about-company/03.webp" - nested folders allowed, ".." never.
export function imagePathParam (event: H3Event): string {
  const value = decodeURIComponent(getRouterParam(event, '_') ?? '')
  if (!IMAGE_PATH.test(value) || value.includes('..')) {
    throw apiError(400, `Invalid image path: "${value}"`)
  }
  return value
}

// The request body as text. Through the web Request rather than h3's
// readRawBody: that one needs Node's Buffer, which a service worker lacks.
export async function readBodyText (event: H3Event): Promise<string> {
  return await toWebRequest(event).text()
}

export async function readJsonBody (event: H3Event, options: { object?: boolean } = {}): Promise<string> {
  const text = await readBodyText(event)
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw apiError(422, 'Request body is not valid JSON')
  }
  if (options.object && (value === null || typeof value !== 'object' || Array.isArray(value))) {
    throw apiError(400, 'Setting document must be a JSON object')
  }
  return text
}

export function requireWritable (event: H3Event) {
  if (event.context.contentWritable === false) {
    throw apiError(403, 'This content API is read-only')
  }
}
