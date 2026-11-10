import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vuetify from 'vite-plugin-vuetify'

const siteSrc = fileURLToPath(new URL('src', import.meta.url))

// The site's Google Search Console code (SEO → "Код підтвердження"),
// written into the page's HTML itself: Google checks the HTML as it is
// served, without running scripts, and with `ssr: false` App.vue's
// useHead() only adds the tag once the page runs. Read from the starting
// content at build time - "Зберегти" in the editor writes
// content/settings/seo.json in dev, so the next deploy carries the code.
function googleSiteVerification (): string {
  try {
    const seo = JSON.parse(readFileSync(new URL('../content/settings/seo.json', import.meta.url), 'utf8')) as { googleSiteVerification?: string }
    return seo.googleSiteVerification?.trim() ?? ''
  } catch {
    return ''
  }
}
const verification = googleSiteVerification()

// The SITE built with the editor: the pages people visit, with their own
// addresses, menu, languages and links.
//
// A Nuxt app of its own, apart from the editor's (repo root): the site must
// look exactly as designed, so none of the editor's styles, plugins or
// Vuetify settings may reach it - and a client's site can later be deployed
// without the editor at all.
//
// Rendering: in the demo every visitor edits a private copy of the site
// that lives only in their browser (IndexedDB), and the server holds only
// the starting content - so the pages are rendered in the browser, from
// that copy, unsaved changes included. The code is written to also render
// on a server: for a client's real site (one published copy for everyone)
// turn `ssr` on and point the data at the content API - see
// src/services/site-data.ts.
//
// Served under /site/ on the editor's own origin - IndexedDB is per origin,
// so that is what lets the site see the editor's work. In dev the editor's
// dev server proxies /site to this one; in a build the generated files are
// copied into the editor's output (modules/site-app.ts).
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',

  ssr: false,

  devServer: {
    port: 3007,
  },

  app: {
    // <demo root>site/ - the root is "/" locally, "/sve-studio/" on GitHub
    // Pages (SVE_ROOT, set by modules/site-app.ts when it builds the site).
    baseURL: `${process.env.SVE_ROOT || '/'}site/`,
    head: {
      htmlAttrs: { lang: 'uk' },
      // GitHub Pages deep links: see the editor's nuxt.config.ts.
      script: [{ innerHTML: String.raw`(function(){var p=new URLSearchParams(location.search).get('__sve_path');if(p!==null){history.replaceState(null,'',location.pathname+p.replace(/^\//,''))}})()`, tagPosition: 'head' }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        ...(verification ? [{ name: 'google-site-verification', content: verification }] : []),
      ],
      link: [
        // The site's own logo replaces this once its settings are in (App.vue).
        { rel: 'icon', href: `${process.env.SVE_ROOT || '/'}favicon.ico`, key: 'favicon' },
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },

  // '@/...' is the site's own source.
  alias: {
    '@': siteSrc,
  },

  // Everything is imported explicitly, as in the editor.
  components: { dirs: [] },
  imports: { scan: false },

  // One catch-all route (app/router.options.ts) - every page of the site is
  // content, not a file here.
  pages: true,

  // First in the page, before any component's own styles: a lot of the
  // site's CSS ties Vuetify on specificity and wins only by coming later.
  css: ['vuetify/lib/styles/main.css'],

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    // Hot reload talks to this server directly: the editor's dev server
    // proxies the pages (/site), not the reload socket.
    server: { hmr: { clientPort: 3007 } },
    // Firebase is loaded only when needed (sign-in, the account's messages).
    // Prebundled together up front: found one by one, Vite bundles each part
    // in a pass of its own, and Firestore then can't see the app ("Service
    // firestore is not available").
    optimizeDeps: { include: ['firebase/app', 'firebase/auth', 'firebase/firestore'] },
    plugins: [
      // The precompiled Vuetify CSS, with Vuetify's own defaults - the
      // editor's SASS settings (rounder corners for its own chrome) must not
      // change the site.
      vuetify({ autoImport: true }),
    ],
  },

  typescript: {
    typeCheck: false,
    tsConfig: { include: ['../src/**/*', '../src/**/*.vue'] },
  },
})
