// Dev only: "Зберегти" in the editor also writes the file to disk, so the
// starting content in content/ can be authored through the editor itself.
// Paths starting with "_seed/" go to content/, anything else to public/.
// Port of vite-plugins/editor-file-api.ts for the Nuxt dev server; in a
// production build this route answers 404.
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const SEED_PREFIX = '_seed/'
const IMAGE_UPLOAD_PATTERN = /^images\/theme_\d+\/uploads\//
const IMAGE_EXTENSION_PATTERN = /\.(?:jpe?g|png|svg|webp|gif)$/i
// An image uploaded through the content API, copied into content/images
// under the same content-hash name the page JSON refers to
// (/api/content/images/<name>), so the starting content carries the file
// and not just a link to the browser's own storage. A page's pictures live
// in a folder of their own (images/products/01.webp) - folders are allowed,
// ".." never is (checked below, and the target must stay inside content/).
const SEED_IMAGE_PATTERN = /^_seed\/images\/(?:[\w-]+\/)*[\w-]+\.(?:jpe?g|png|svg|webp|gif|avif)$/i

function resolveTarget (relativePath: string): { target: string, base: string, prefix: string } {
  const root = process.cwd()
  if (relativePath.startsWith(SEED_PREFIX)) {
    const base = path.resolve(root, 'content')
    return { target: path.resolve(base, relativePath.slice(SEED_PREFIX.length)), base, prefix: SEED_PREFIX }
  }
  const base = path.resolve(root, 'public')
  return { target: path.resolve(base, relativePath), base, prefix: '' }
}

async function denylist (): Promise<string[]> {
  const raw = await fs.readFile(path.resolve(process.cwd(), '.private/denylist.txt'), 'utf8').catch(() => '')
  return raw.split(/\r?\n/).map(line => line.trim().toLowerCase()).filter(line => line && !line.startsWith('#'))
}

export default defineEventHandler(async event => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const method = getMethod(event)

  if (method === 'DELETE') {
    const relativePath = String(getQuery(event).path || '')
    if (!relativePath || relativePath.includes('..') || !relativePath.endsWith('.json')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid path: must be a relative .json path, without ".."' })
    }
    const { target, base } = resolveTarget(relativePath)
    if (!target.startsWith(base + path.sep)) {
      throw createError({ statusCode: 400, statusMessage: 'Path escapes the allowed directory' })
    }
    await fs.unlink(target).catch(() => {})
    return { ok: true }
  }

  if (method !== 'PUT' && method !== 'POST') {
    throw createError({ statusCode: 405 })
  }

  const body = await readBody<{ path?: string, content?: unknown, encoding?: string }>(event)
  const relativePath = String(body?.path || '')
  const isJson = relativePath.endsWith('.json')
  const isCss = relativePath.endsWith('.css')
  const isImageUpload = body?.encoding === 'base64' && IMAGE_UPLOAD_PATTERN.test(relativePath) && IMAGE_EXTENSION_PATTERN.test(relativePath)
  const isSeedImage = body?.encoding === 'base64' && SEED_IMAGE_PATTERN.test(relativePath)
  if (!relativePath || relativePath.includes('..') || !(isJson || isCss || isImageUpload || isSeedImage)) {
    console.warn('[public-file] refused:', relativePath)
    throw createError({ statusCode: 400, statusMessage: 'Invalid path: must be a relative .json/.css path, or a base64 image upload, without ".."' })
  }

  const resolved = resolveTarget(relativePath)
  const target = isImageUpload
    ? path.resolve(path.dirname(resolved.target), `${randomUUID()}${path.extname(relativePath)}`)
    : resolved.target
  if (!target.startsWith(resolved.base + path.sep)) {
    throw createError({ statusCode: 400, statusMessage: 'Path escapes the allowed directory' })
  }

  // A guard against content that must never reach the repository (a former
  // client's names, phones, addresses): words listed one per line in
  // .private/denylist.txt - a file git ignores, so the list itself is never
  // published. Without the file, nothing is checked.
  if (!isImageUpload && !isSeedImage) {
    const text = (isJson ? JSON.stringify(body.content) : String(body.content)).toLowerCase()
    const found = (await denylist()).filter(word => text.includes(word))
    if (found.length > 0) {
      throw createError({ statusCode: 409, statusMessage: `Not written: the content contains ${found.length} denied word(s) - see .private/denylist.txt` })
    }
  }

  await fs.mkdir(path.dirname(target), { recursive: true })
  await (isImageUpload || isSeedImage ? fs.writeFile(target, Buffer.from(String(body.content), 'base64')) : fs.writeFile(target, isJson ? `${JSON.stringify(body.content, null, 2)}\n` : String(body.content), 'utf8'))
  return { ok: true, path: resolved.prefix + path.relative(resolved.base, target).split(path.sep).join('/') }
})
