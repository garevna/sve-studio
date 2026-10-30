// Starts the in-browser content API (service-worker/content-api-sw.ts) and
// waits until it controls this page, so the app's very first /api request
// is already answered by it. If that isn't possible (no service worker
// support, a private window that blocks it...), `contentApiReady` is false
// and the app works on its local IndexedDB copy alone.
const READY_TIMEOUT_MS = 5000

function timeout (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function ask (worker: ServiceWorker, message: Record<string, unknown>): Promise<unknown> {
  return new Promise(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = event => resolve(event.data)
    worker.postMessage(message, [channel.port2])
  })
}

async function startContentApi (base: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }
  try {
    await navigator.serviceWorker.register(`${base}content-api-sw.js`, { scope: base })
    const registration = await Promise.race([navigator.serviceWorker.ready, timeout(READY_TIMEOUT_MS).then(() => null)])
    if (!registration?.active) {
      return false
    }
    // First visit, or a hard reload: the page isn't controlled yet.
    if (!navigator.serviceWorker.controller) {
      const controlled = new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
      })
      await Promise.race([ask(registration.active, { type: 'claim' }).then(() => controlled), timeout(READY_TIMEOUT_MS)])
    }
    if (!navigator.serviceWorker.controller) {
      return false
    }
    // Controlled is not enough: with DevTools' "Bypass for network" on, the
    // worker is registered and in control, yet requests go past it to the
    // read-only server - every save then fails with 403. The worker tags its
    // answers; without the tag, work on the local copy instead.
    const probe = await fetch(`${base}api/content/styles`, { cache: 'no-store' }).catch(() => null)
    if (probe?.headers.get('X-Content-Api') !== 'service-worker') {
      console.warn('Content API: requests bypass the service worker (DevTools "Bypass for network"?) - working on the local copy only')
      return false
    }
    return true
  } catch (error) {
    console.error('Content API could not start - working on the local copy only', error)
    return false
  }
}

export default defineNuxtPlugin({
  name: 'content-api',
  async setup () {
    const ready = await startContentApi(useRuntimeConfig().app.baseURL)
    return { provide: { contentApiReady: ready } }
  },
})
