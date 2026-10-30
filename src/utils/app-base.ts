// The app's base URL ("/" or e.g. "/editor/"), always ending in "/".
//
// Under Nuxt, import.meta.env.BASE_URL is the build-assets folder
// ("/_nuxt/"), not the site root - the real base is in Nuxt's runtime
// config on window.__NUXT__. The old Vite build has only BASE_URL.
export function appBase (): string {
  const nuxtBase = (globalThis as { __NUXT__?: { config?: { app?: { baseURL?: string } } } }).__NUXT__?.config?.app?.baseURL
  const base = nuxtBase ?? import.meta.env.BASE_URL ?? '/'
  return base.endsWith('/') ? base : `${base}/`
}
