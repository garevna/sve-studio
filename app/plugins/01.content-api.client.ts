// Which API this editor talks to - decided once, before the first request.
//
//   'server'         - a real deployment: a content API with sign-in answers
//                      at this origin's /api. The in-browser one must stay
//                      out of the way, or every save would land in this
//                      visitor's own browser instead of on the server.
//   'service-worker' - the demo: the in-browser API
//                      (service-worker/content-api-sw.ts) answers /api, and
//                      each visitor edits their own private copy.
//   'local'          - neither could be reached (no service worker support, a
//                      private window that blocks it...): the app works on
//                      its local IndexedDB copy alone.
//
// `contentApiReady` is false only in the last case - it means "no API is
// answering", which is what stores/ajax.ts falls back from.
import { serverRolesEnabled } from '@/services/editor-users'
import { report, setReportTarget } from '@/utils/report'

type ContentApiKind = 'server' | 'service-worker' | 'local'

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

// A worker registered on an earlier visit to this address - when the demo
// was published here, say - still controls the page and would keep
// intercepting /api. Unregistering is not enough for THIS page (the worker
// goes on controlling it until the next load), so the page is reloaded.
//
// Once per tab, and that is not belt and braces: whether a registration is
// still listed right after being unregistered is up to the browser, and
// "reload while a worker is listed" could otherwise reload for ever. One
// reload is all the fix needs - after it, nothing is controlling the page
// whatever the list says.
const RELOAD_ONCE = 'content-api-worker-cleared'

function reloadedAlready (): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_ONCE)) {
      return true
    }
    sessionStorage.setItem(RELOAD_ONCE, '1')
  } catch {
    // Storage blocked: one reload at most is still better than none, and a
    // worker that the browser keeps listing would be a loop - so don't.
    return true
  }
  return false
}

async function clearWorker (): Promise<boolean> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  const ours = registrations.filter(item => item.active?.scriptURL.includes('content-api-sw'))
  if (ours.length === 0) {
    return false
  }
  await Promise.all(ours.map(item => item.unregister()))
  return !reloadedAlready()
}

async function startContentApi (base: string): Promise<ContentApiKind> {
  // Asked first, and of the network: a real server behind /api means the
  // in-browser API is not started at all.
  if (await serverRolesEnabled()) {
    // clearWorker() says whether a reload is still needed (and allowed).
    if ('serviceWorker' in navigator && await clearWorker()) {
      location.reload()
    }
    return 'server'
  }
  if (!('serviceWorker' in navigator)) {
    return 'local'
  }
  try {
    await navigator.serviceWorker.register(`${base}content-api-sw.js`, { scope: base })
    const registration = await Promise.race([navigator.serviceWorker.ready, timeout(READY_TIMEOUT_MS).then(() => null)])
    if (!registration?.active) {
      return 'local'
    }
    // First visit, or a hard reload: the page isn't controlled yet.
    if (!navigator.serviceWorker.controller) {
      const controlled = new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
      })
      await Promise.race([ask(registration.active, { type: 'claim' }).then(() => controlled), timeout(READY_TIMEOUT_MS)])
    }
    if (!navigator.serviceWorker.controller) {
      return 'local'
    }
    // Controlled is not enough: with DevTools' "Bypass for network" on, the
    // worker is registered and in control, yet requests go past it to the
    // read-only server - every save then fails with 403. The worker tags its
    // answers; without the tag, work on the local copy instead.
    const probe = await fetch(`${base}api/content/styles`, { cache: 'no-store' }).catch(() => null)
    if (probe?.headers.get('X-Content-Api') !== 'service-worker') {
      report('warn', 'content-api', 'Requests bypass the service worker (DevTools "Bypass for network"?) - working on the local copy only')
      return 'local'
    }
    return 'service-worker'
  } catch (error) {
    report('warn', 'content-api', 'Could not start - working on the local copy only', error)
    return 'local'
  }
}

export default defineNuxtPlugin({
  name: 'content-api',
  async setup () {
    const kind = await startContentApi(useRuntimeConfig().app.baseURL)
    // where reports go from now on (utils/report.ts)
    setReportTarget(kind)
    return { provide: { contentApiReady: kind !== 'local', contentApiKind: kind } }
  },
})
