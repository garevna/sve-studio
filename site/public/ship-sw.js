// The demo ship's own worker (only the ship registers it - see
// src/utils/site-source.ts): a picture the visitor uploaded in the Верф
// lives in the dock's browser storage, not on any server. Asked for one
// (/api/content/images/...), this asks the page, which asks the dock
// through the bridge (src/db/bridge.ts), and answers with its bytes.
const PREFIX = '/api/content/images/'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

async function fromDock (event, path) {
  const client = (event.clientId && await self.clients.get(event.clientId)) || (await self.clients.matchAll({ type: 'window' }))[0]
  if (!client) {
    return fetch(event.request)
  }
  const channel = new MessageChannel()
  const answer = new Promise(resolve => {
    channel.port1.addEventListener('message', message => resolve(message.data))
    channel.port1.start()
    setTimeout(() => resolve(null), 20_000)
  })
  client.postMessage({ type: 'sve:ship-image', path }, [channel.port2])
  const found = await answer
  if (!found) {
    return new Response('', { status: 404 })
  }
  return new Response(found.bytes, { headers: { 'Content-Type': found.type || 'application/octet-stream' } })
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) {
    return
  }
  event.respondWith(fromDock(event, decodeURIComponent(url.pathname.slice(PREFIX.length))))
})
