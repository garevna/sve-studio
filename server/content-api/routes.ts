// The content API's routes - the contract in docs/api-requirements.md.
// Paths are relative to /api/content.
import { createRouter, getQuery, readFormData } from 'h3'
import { apiError, defineApiHandler, imagePathParam, readBodyText, readJsonBody, requireWritable, slugParam, styleNameParam } from './handler'
import { IMAGE_TYPES } from './repository'

const SETTINGS_KEYS = new Set(['global', 'palette', 'seo', 'menu-content', 'popups', 'client-api', 'forms'])
const PUBLIC_KEYS = new Set(['account-pages'])

function json (body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}

function settingsKey (key: string): string {
  if (!SETTINGS_KEYS.has(key)) {
    throw apiError(404, `Unknown settings document: ${key}`)
  }
  return key
}

function publicKey (key: string): string {
  if (!PUBLIC_KEYS.has(key)) {
    throw apiError(404, `Unknown public document: ${key}`)
  }
  return key
}

export function createContentRouter () {
  const router = createRouter()

  // --- pages ---------------------------------------------------------------

  router.get('/pages', defineApiHandler((event, { repo }) =>
    repo.listPages(getQuery(event).includeHidden === 'true')))

  router.get('/pages/:slug', defineApiHandler(async (event, { repo }) => {
    const body = await repo.read('pages', slugParam(event))
    if (body === null) {
      throw apiError(404, 'Page not found')
    }
    return json(body)
  }))

  // Upsert: creates the page when the slug is new.
  router.put('/pages/:slug', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    await repo.write('pages', slugParam(event), await readJsonBody(event))
    return { ok: true }
  }))

  router.delete('/pages/:slug', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    await repo.remove('pages', slugParam(event))
    return { ok: true }
  }))

  router.patch('/pages/:slug/visibility', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    const { visible } = JSON.parse(await readJsonBody(event, { object: true })) as { visible?: unknown }
    if (typeof visible !== 'boolean') {
      throw apiError(422, '"visible" must be true or false')
    }
    await repo.setVisible(slugParam(event), visible)
    return { ok: true }
  }))

  // --- settings ------------------------------------------------------------

  router.get('/settings/:key', defineApiHandler(async (event, { repo }) => {
    const key = settingsKey(slugParam(event, 'key'))
    const body = await repo.read('settings', key)
    if (body === null) {
      throw apiError(404, 'Settings document not found')
    }
    // The API keeps the menu as { items: [...] } (a settings document must
    // be an object); the bundled file is a bare array.
    if (key === 'menu-content') {
      const value = JSON.parse(body) as unknown
      return Array.isArray(value) ? { items: value } : value
    }
    return json(body)
  }))

  router.put('/settings/:key', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    const key = settingsKey(slugParam(event, 'key'))
    await repo.write('settings', key, await readJsonBody(event, { object: true }))
    return { ok: true }
  }))

  // --- public (account page variants) -------------------------------------

  router.get('/public/:key', defineApiHandler(async (event, { repo }) => {
    const body = await repo.read('public', publicKey(slugParam(event, 'key')))
    if (body === null) {
      throw apiError(404, 'Document not found')
    }
    return json(body)
  }))

  router.put('/public/:key', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    await repo.write('public', publicKey(slugParam(event, 'key')), await readJsonBody(event))
    return { ok: true }
  }))

  // --- styles --------------------------------------------------------------

  // Bare names, like the real API ("buttons", not "buttons.css").
  router.get('/styles', defineApiHandler(async (_event, { repo }) =>
    (await repo.listStyles()).map(name => name.replace(/\.css$/, ''))))

  router.get('/styles/:name', defineApiHandler(async (event, { repo }) => {
    const body = await repo.read('styles', styleNameParam(event))
    if (body === null) {
      throw apiError(404, 'Stylesheet not found')
    }
    return new Response(body, { headers: { 'Content-Type': 'text/css; charset=utf-8' } })
  }))

  router.put('/styles/:name', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    await repo.write('styles', styleNameParam(event), await readBodyText(event))
    return { ok: true }
  }))

  // --- images --------------------------------------------------------------

  // Named by content hash, so the same picture uploaded twice is stored once.
  router.post('/images', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    const file = (await readFormData(event)).get('file')
    if (!(file instanceof Blob)) {
      throw apiError(422, 'Field "file" is required')
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    const hash = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')
    const fromName = ((file as File).name?.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
    const fromType = Object.keys(IMAGE_TYPES).find(extension => IMAGE_TYPES[extension] === file.type)
    const extension = IMAGE_TYPES[fromName] ? fromName : (fromType ?? 'bin')
    const name = `${hash}.${extension}`
    await repo.saveImage(name, bytes)
    return { path: `/api/content/images/${name}` }
  }))

  router.get('/images/**', defineApiHandler(async (event, { repo }) => {
    const image = await repo.readImage(imagePathParam(event))
    if (!image) {
      throw apiError(404, 'Image not found')
    }
    // A copy typed over a plain ArrayBuffer, which is what Response accepts.
    return new Response(new Uint8Array(image.bytes), { headers: { 'Content-Type': image.type, 'Cache-Control': 'no-cache' } })
  }))

  router.delete('/images/**', defineApiHandler(async (event, { repo }) => {
    requireWritable(event)
    await repo.deleteImage(imagePathParam(event))
    return { ok: true }
  }))

  return router
}
