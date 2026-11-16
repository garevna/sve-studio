// Starts the site: pinia, Vuetify with the site's own theme (built from its
// palette), and the in-browser content API.
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { dockGet, startBridge } from '../../src/db/bridge'
import { dbRequest } from '../../src/db/client'
import { getPalette } from '../../src/services/site-data'
import { probeContentApi } from '../../src/utils/content-api-state'
import { installImageFallback } from '../../src/utils/image-fallback'
import { PUBLISHED } from '../../src/utils/published'
import { report, reportUncaught } from '../../src/utils/report'
import { DOCK_ORIGIN, isBridgePage } from '../../src/utils/site-source'
import { sveRoot } from '../../src/utils/sve-root'

// The editor's content API worker (service-worker/content-api-sw.ts) - it
// serves the images the visitor uploaded in the editor, which exist only in
// their browser. Registered here too, for a visitor who opens the site
// first; nothing waits for it. Not on the owner's own site (it has only the
// released files), nor on the demo ship on its own address (it asks the dock).
function startContentApi () {
  if ('serviceWorker' in navigator && !PUBLISHED && !DOCK_ORIGIN) {
    navigator.serviceWorker.register(`${sveRoot()}content-api-sw.js`, { scope: sveRoot() })
      .then(() => navigator.serviceWorker.ready)
      // Does it actually answer? (see utils/content-api-state.ts)
      .then(() => probeContentApi(sveRoot()))
      .catch(error => {
        report('warn', 'content-api', 'Content API worker could not start', error)
      })
  }
}

// The demo ship on its own address: its worker (public/ship-sw.js) asks
// this page for a picture the visitor uploaded in the Верф, and the page
// asks the dock (db/bridge.ts). Waits a moment for the worker to take the
// page, so the first pictures already go through it.
async function startShip () {
  if (!('serviceWorker' in navigator)) {
    return
  }
  navigator.serviceWorker.addEventListener('message', async event => {
    if (event.data?.type !== 'sve:ship-image' || !event.ports[0]) {
      return
    }
    const found = await dockGet<{ bytes: ArrayBuffer, type: string }>(`/content/images/${encodeURIComponent(event.data.path)}`).catch(() => null)
    event.ports[0].postMessage(found, found ? [found.bytes] : [])
  })
  // the Верф asks for a fresh look after a save
  window.addEventListener('message', event => {
    if (event.origin === DOCK_ORIGIN && event.data?.type === 'sve:reload') {
      location.reload()
    }
  })
  try {
    await navigator.serviceWorker.register('/ship-sw.js', { scope: '/' })
    if (!navigator.serviceWorker.controller) {
      await Promise.race([
        new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
    }
  } catch (error) {
    report('warn', 'ship', 'The ship worker could not start', error)
  }
}

export default defineNuxtPlugin({
  name: 'site',
  async setup (nuxtApp) {
    startContentApi()
    // The dock's site in a ship's hidden frame: the ship's content API.
    if (isBridgePage()) {
      startBridge(dbRequest)
    }
    if (DOCK_ORIGIN) {
      await startShip()
    }
    // A picture not set or not found shows the checkerboard.
    installImageFallback()

    // Nothing goes to the console: what nobody caught is reported
    // (src/utils/report.ts).
    reportUncaught(nuxtApp.vueApp)

    const pinia = createPinia()
    nuxtApp.vueApp.use(pinia)

    // Vuetify's theme colours (v-btn color="primary"...) are a one-time
    // createVuetify() option; the CSS variables the site's stylesheets read
    // come from the same palette (src/App.vue).
    const palette = await getPalette()
    const hexColors = Object.fromEntries(
      Object.entries(palette).filter(([, value]) => /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)),
    )
    nuxtApp.vueApp.use(createVuetify({
      theme: {
        defaultTheme: 'appTheme',
        themes: {
          appTheme: {
            dark: false,
            colors: {
              ...hexColors,
              'surface': palette['main-background'] as string,
              'surface-bright': palette.homefone as string,
              'surface-light': palette.white as string,
              'surface-variant': palette['light-grey-2'] as string,
            },
            variables: {
              'border-color': palette['light-grey-1'] as string,
              'border-opacity': 0.2,
            },
          },
        },
      },
    }))
  },
})
