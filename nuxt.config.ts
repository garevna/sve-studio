import { fileURLToPath } from 'node:url'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

const editorSrc = fileURLToPath(new URL('src', import.meta.url))
const contentDir = fileURLToPath(new URL('content', import.meta.url))

// Nuxt app of the Site Visual Editor (SVE).
//
// The editor's code lives in src/; app/ holds only the Nuxt glue - root
// component, plugins, route table. Rendering: the editor is client-only - it lives on IndexedDB
// and the content API service worker; per-route SSR goes into routeRules as
// public pages get added.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',

  ssr: false,

  devServer: {
    // Not 3000/3005: a service worker is registered per origin (host:port)
    // and must never sit in front of another app.
    port: 3006,
  },

  // '@/...' is the editor's own source, exactly as in the Vite build.
  alias: {
    '@': editorSrc,
  },

  // The editor imports everything explicitly; Nuxt's directory scanning
  // would only add a second, implicit way of doing the same.
  components: { dirs: [] },
  imports: { scan: false },

  // The route table is the editor's own (src/router/routes.ts), wired in by
  // app/router.options.ts; there is no pages/ folder.
  pages: true,

  modules: ['./modules/content-manifest', './modules/content-api-sw', './modules/site-app'],

  css: [
    'vuetify/styles',
    // Roboto - the editor's own interface font.
    ...[100, 300, 400, 500, 700, 900].flatMap(weight => [`@fontsource/roboto/${weight}.css`, `@fontsource/roboto/${weight}-italic.css`]),
    `${editorSrc}/styles/editor-ui.css`,
    // The editor's interface kit (packages/editor-ui).
    '@sve/editor-ui/styles.css',
  ],

  app: {
    head: {
      title: 'Site Visual Editor (SVE)',
      link: [
        // The editor's icon: the owner's logo. The GIF walks in Firefox (other
        // browsers show its first frame); the .ico and PNGs are the still version.
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/gif', href: '/favicon.gif' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
      style: [
        {
          // Cascade layer order, declared before any stylesheet - see
          // editor-ui.css for why its overrides live in `app-content`.
          innerHTML: '@layer sve-ui, app-content, vuetify-core, vuetify-components, vuetify-overrides, vuetify-app-styles, vuetify-utilities, vuetify-final;',
          tagPriority: 'critical',
        },
      ],
    },
  },

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    plugins: [
      vuetify({
        autoImport: true,
        // Absolute: Nuxt's Vite root is app/, not the repo root.
        styles: { configFile: `${editorSrc}/styles/settings.scss` },
      }),
    ],
    vue: {
      template: { transformAssetUrls },
    },
  },

  runtimeConfig: {
    contentApi: {
      // 'read-only' | 'open' - override with NUXT_CONTENT_API_ACCESS.
      access: 'read-only',
    },
  },

  nitro: {
    // The starting content (content/): readable by the server API on any
    // host, and served to the browser's API worker at /_seed - a path of
    // its own, so static files never collide with /api routes.
    serverAssets: [{ baseName: 'seed', dir: contentDir }],
    publicAssets: [{ baseURL: '_seed', dir: contentDir, maxAge: 0 }],
    storage: {
      'content-docs': { driver: 'memory' },
      'content-images': { driver: 'memory' },
    },
    devStorage: {
      'content-docs': { driver: 'fs', base: './.data/content-docs' },
      'content-images': { driver: 'fs', base: './.data/content-images' },
    },
  },

  typescript: {
    // Type-checked by `pnpm type-check`, not on every dev rebuild.
    typeCheck: false,
    // The editor's own source, checked in full (not only what app/ imports).
    tsConfig: { include: ['../src/**/*', '../src/**/*.vue', '../packages/editor-ui/src/**/*', '../packages/editor-ui/src/**/*.vue'] },
  },
})
