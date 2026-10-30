// Built site only (modules/site-app.ts): an address under /site/ that is
// not one of its files - /site/about-company, /site/en/... - gets the
// site's start page; its router then shows the page the address names.
// In dev the site's own dev server answers /site (proxied), never this.
export default defineEventHandler(async event => {
  if (import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const html = await useStorage('assets:site').getItemRaw('200.html') ?? await useStorage('assets:site').getItemRaw('index.html')
  if (!html) {
    throw createError({ statusCode: 404 })
  }
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return typeof html === 'string' ? html : new TextDecoder().decode(html as Uint8Array)
})
