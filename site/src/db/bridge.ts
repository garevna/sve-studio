import { DOCK_ORIGIN, SHIP_ORIGIN } from '../utils/site-source'
import { sveRoot } from '../utils/sve-root'

// The bridge between the demo's ship (its own address) and the dock, whose
// browser database holds what the visitor built (utils/site-source.ts).
// The dock is the ship's content API: the ship sends it the requests it
// would send a content server (docs/api-requirements.md - the reading
// ones), only over the window's message channel instead of the network:
//
//   GET /content/pages?includeHidden=true   -> [{ pageId, title, visible }]
//   GET /content/pages/{slug}               -> the page | 404
//   GET /content/settings/{key}             -> the settings | 404
//   GET /content/styles/{name}              -> CSS text | 404
//   GET /content/images/{path}              -> { bytes, type } | 404
//
// Ship -> dock: { type: 'sve:api', id, method, path }
// Dock -> ship: { type: 'sve:api', id, status, body }

interface ApiRequest {
  type: 'sve:api'
  id: number
  method: 'GET'
  path: string
}
interface ApiResponse {
  type: 'sve:api'
  id: number
  status: number
  body?: unknown
}

// --- the ship's side -----------------------------------------------------------

let frame: Promise<Window> | null = null
let nextId = 1
const waiting = new Map<number, (response: ApiResponse) => void>()

function openFrame (): Promise<Window> {
  frame ??= new Promise<Window>((resolve, reject) => {
    const element = document.createElement('iframe')
    element.src = `${DOCK_ORIGIN}/site/?sve-bridge`
    element.title = 'Pagewright'
    element.setAttribute('aria-hidden', 'true')
    element.tabIndex = -1
    element.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden'
    const timer = setTimeout(() => reject(new Error('The dock does not answer')), 30_000)
    window.addEventListener('message', event => {
      if (event.origin !== DOCK_ORIGIN || event.source !== element.contentWindow) {
        return
      }
      const message = event.data as ApiResponse | { type: 'sve:api-ready' }
      if (message?.type === 'sve:api-ready') {
        clearTimeout(timer)
        resolve(element.contentWindow!)
      } else if (message?.type === 'sve:api') {
        waiting.get(message.id)?.(message)
        waiting.delete(message.id)
      }
    })
    document.body.append(element)
  })
  return frame
}

// One request to the dock; a 404 is null, any other failure throws.
export async function dockGet<T> (path: string): Promise<T | null> {
  const target = await openFrame()
  const id = nextId++
  const response = await new Promise<ApiResponse>(resolve => {
    waiting.set(id, resolve)
    target.postMessage({ type: 'sve:api', id, method: 'GET', path } satisfies ApiRequest, DOCK_ORIGIN)
  })
  if (response.status === 404) {
    return null
  }
  if (response.status >= 400) {
    throw new Error(`The dock answered ${response.status} to GET ${path}${response.body ? `: ${String(response.body)}` : ''}`)
  }
  return response.body as T
}

// What the site asks the browser database (db/client.ts), asked of the dock.
export function bridgeRequest<T> (route: string, action: string, data?: unknown): Promise<T> {
  const asked = (data ?? {}) as { pageId?: string, key?: string, name?: string }
  const slug = (value: string | undefined) => encodeURIComponent(value ?? '')
  if (route === 'pages' && action === 'list') {
    return dockGet<T>('/content/pages?includeHidden=true') as Promise<T>
  }
  if (route === 'pages' && action === 'get') {
    return dockGet<T>(`/content/pages/${slug(asked.pageId)}`) as Promise<T>
  }
  if (route === 'settings' && action === 'get') {
    return dockGet<T>(`/content/settings/${slug(asked.key)}`) as Promise<T>
  }
  if (route === 'styles' && action === 'get') {
    return dockGet<T>(`/content/styles/${slug(asked.name)}`) as Promise<T>
  }
  return Promise.reject(new Error(`The demo ship does not ${action} ${route}`))
}

// --- the dock's side (the frame) -----------------------------------------------

// A picture: the visitor's own, from the dock's content API (its worker),
// else the released one.
async function image (path: string): Promise<{ bytes: ArrayBuffer, type: string } | null> {
  for (const url of [`${sveRoot()}api/content/images/${path}`, `${sveRoot()}_seed/images/${path}`]) {
    const response = await fetch(url).catch(() => null)
    const type = response?.headers.get('content-type') ?? ''
    if (response?.ok && !type.includes('text/html')) {
      return { bytes: await response.arrayBuffer(), type }
    }
  }
  return null
}

type Local = (route: string, action: string, data?: unknown) => Promise<unknown>

// GET <path> answered from the dock's own database; null - not found.
async function answer (path: string, local: Local): Promise<{ body: unknown, transfer?: Transferable[] } | null> {
  const url = new URL(path, 'https://dock.invalid')
  const [, root, kind, ...rest] = url.pathname.split('/')
  const name = decodeURIComponent(rest.join('/'))
  if (root !== 'content') {
    return null
  }
  let body: unknown = null
  if (kind === 'pages' && !name) {
    body = await local('pages', 'list')
  } else {
    switch (kind) {
      case 'pages': {
        body = await local('pages', 'get', { pageId: name })

        break
      }
      case 'settings': {
        body = await local('settings', 'get', { key: name })

        break
      }
      case 'styles': {
        body = await local('styles', 'get', { name })

        break
      }
      case 'images': {
        const found = await image(name)
        return found ? { body: found, transfer: [found.bytes] } : null
      }
 // No default
    }
  }
  return body === null || body === undefined ? null : { body }
}

export function startBridge (local: Local) {
  window.addEventListener('message', async event => {
    const request = event.data as ApiRequest
    if (event.origin !== SHIP_ORIGIN || request?.type !== 'sve:api' || !event.source) {
      return
    }
    const send = (status: number, body?: unknown, transfer: Transferable[] = []) =>
      (event.source as Window).postMessage({ type: 'sve:api', id: request.id, status, body } satisfies ApiResponse, { targetOrigin: SHIP_ORIGIN, transfer })
    if (request.method !== 'GET') {
      send(405, 'The dock only answers GET')
      return
    }
    try {
      const found = await answer(request.path, local)
      if (found) {
        send(200, found.body, found.transfer)
      } else {
        send(404)
      }
    } catch (error) {
      send(500, error instanceof Error ? error.message : String(error))
    }
  })
  window.parent.postMessage({ type: 'sve:api-ready' }, SHIP_ORIGIN)
}
