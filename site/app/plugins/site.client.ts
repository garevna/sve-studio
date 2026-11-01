// Starts the site: pinia, Vuetify with the site's own theme (built from its
// palette), and the in-browser content API.
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { getPalette } from '../../src/services/site-data'
import { probeContentApi } from '../../src/utils/content-api-state'
import { sveRoot } from '../../src/utils/sve-root'

// The editor's content API worker (service-worker/content-api-sw.ts) - it
// serves the images the visitor uploaded in the editor, which exist only in
// their browser. Registered here too, for a visitor who opens the site
// first; nothing waits for it.
function startContentApi () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${sveRoot()}content-api-sw.js`, { scope: sveRoot() })
      .then(() => navigator.serviceWorker.ready)
      // Does it actually answer? (see utils/content-api-state.ts)
      .then(() => probeContentApi(sveRoot()))
      .catch(error => {
        console.warn('Content API worker could not start', error)
      })
  }
}

export default defineNuxtPlugin({
  name: 'site',
  async setup (nuxtApp) {
    startContentApi()

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
