/// <reference lib="webworker" />
// The demo's content API, running in the visitor's browser.
//
// It is the same h3 app the Nitro server mounts (server/content-api) - same
// routes, middleware and error format - with two runtime-specific pieces:
//   - storage: the visitor's own IndexedDB, so every visitor edits a
//     private copy of the site;
//   - seed: the starting content (the repo's content/ folder), fetched
//     from /_seed.
//
// Built by modules/content-api-sw.ts into /content-api-sw.js.
import type { SeedSource } from '../server/content-api/seed'
import { toWebHandler } from 'h3'
import { createStorage } from 'unstorage'
import indexedbDriver from 'unstorage/drivers/indexedb'
import { createContentApiHandler } from '../server/content-api/app'
import { createContentRepository } from '../server/content-api/repository'

declare const self: ServiceWorkerGlobalScope

// The app's base URL: "/" in dev, the deploy base in a build.
const base = () => self.registration.scope

async function fetchSeed (path: string): Promise<Response | null> {
  const response = await fetch(`${base()}_seed/${path}`, { cache: 'no-cache' })
  // A dev server answers an unknown path with its index.html and 200.
  if (!response.ok || (response.headers.get('content-type') ?? '').includes('text/html')) {
    return null
  }
  return response
}

const seed: SeedSource = {
  readText: async path => (await fetchSeed(path))?.text() ?? null,
  readBytes: async path => {
    const response = await fetchSeed(path)
    return response ? new Uint8Array(await response.arrayBuffer()) : null
  },
}

const repo = createContentRepository({
  seed,
  // One IndexedDB database per store: idb-keyval opens each with one store.
  docs: createStorage({ driver: indexedbDriver({ dbName: 'content-api-docs', storeName: 'docs' }) }),
  images: createStorage({ driver: indexedbDriver({ dbName: 'content-api-images', storeName: 'images' }) }),
  followSeed: process.env.NODE_ENV === 'development',
  // A published demo takes every new release whole.
  resetOnRelease: process.env.NODE_ENV !== 'development',
})

const handle = toWebHandler(createContentApiHandler({ repo, access: 'open' }))

// --- lifecycle ---------------------------------------------------------------

self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

// 'claim': take over a page that isn't controlled yet (first visit, hard
// reload). Every message is answered, so a caller waiting on one never hangs.
self.addEventListener('message', event => {
  const message = (event.data ?? {}) as { type?: string }
  const done = message.type === 'claim' ? self.clients.claim() : Promise.resolve()
  event.waitUntil(done.then(() => event.ports[0]?.postMessage({ ok: true })))
})

// --- requests ------------------------------------------------------------------

// Requests under the worker's own scope: "/api/..." in dev, "/sve-studio/api/..."
// on GitHub Pages. The API itself is mounted at /api, so the scope's path is
// taken off before it answers.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  const scopePath = new URL(base()).pathname
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${scopePath}api/`)) {
    return
  }
  // /api/users/* is the one thing this worker must NOT answer: it is how the
  // editor finds out whether there is a real server behind /api at all
  // (app/plugins/01.content-api.client.ts). Answering it with this API's own
  // 404 would hide a server from the editor for as long as a worker left
  // over from a demo visit at this address stayed registered - and every
  // save would go on landing in this browser instead of on the server.
  if (url.pathname.startsWith(`${scopePath}api/users`)) {
    return
  }
  const apiUrl = new URL(url)
  apiUrl.pathname = url.pathname.slice(scopePath.length - 1)
  event.respondWith(respond(new Request(apiUrl, event.request), apiUrl))
})

// The API answers a missing image with 404, like a real one. On a page that
// would be a broken-image icon, so the demo shows a neutral placeholder.
// Marks an answer as this worker's. The page checks it at start: a
// registered worker can still be bypassed (DevTools "Bypass for network"),
// and then the read-only server answers instead - every save fails with 403.
const ANSWERED_BY = 'X-Content-Api'

async function respond (request: Request, url: URL): Promise<Response> {
  const response = await handle(request)
  if (response.status === 404 && request.method === 'GET' && url.pathname.startsWith('/api/content/images/')) {
    return new Response(PLACEHOLDER_SVG, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache', 'X-Placeholder': '1', [ANSWERED_BY]: 'service-worker' },
    })
  }
  const headers = new Headers(response.headers)
  headers.set(ANSWERED_BY, 'service-worker')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="500" fill="#E3E8EE"/>
  <g fill="none" stroke="#A7B4C2" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" transform="translate(320 170)">
    <rect x="0" y="0" width="160" height="130" rx="14"/>
    <circle cx="48" cy="42" r="14"/>
    <path d="M10 118 L62 68 L98 100 L120 80 L152 112"/>
  </g>
</svg>`
