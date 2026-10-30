// Dev only: an image uploaded in the editor is written straight into
// content/images/<page id>/ - part of the starting content, next to the page
// that uses it - instead of into one browser's storage. Answers the path the
// content API serves it at (/api/content/images/<page id>/<file>), with a
// ?v= fingerprint so a replaced picture is not shown from cache.
//
// `replaces`: the path the slot held before. When it is a file in the same
// folder, the upload takes its name (the old file is overwritten, or removed
// if the new one has another extension) - replacing a picture does not pile
// up files. The editor only sends it when nothing else on the page uses
// that file.
//
// In a production build: 404.
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'avif'])
const API_PREFIX = '/api/content/images/'

function slug (value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

async function exists (file: string): Promise<boolean> {
  return fs.access(file).then(() => true, () => false)
}

export default defineEventHandler(async event => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405 })
  }

  const body = await readBody<{ folder?: string, fileName?: string, content?: string, replaces?: string }>(event)
  const folder = String(body?.folder ?? '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
  const fileName = String(body?.fileName ?? '')
  const extension = (fileName.match(/\.([a-z\d]+)$/i)?.[1] ?? '').toLowerCase()
  if (!EXTENSIONS.has(extension) || typeof body?.content !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Expected an image file (jpg, png, svg, webp, gif, avif) as base64' })
  }

  const imagesDir = path.resolve(process.cwd(), 'content', 'images')
  const dir = path.resolve(imagesDir, folder)
  if (!dir.startsWith(imagesDir + path.sep)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid folder' })
  }
  await fs.mkdir(dir, { recursive: true })

  // Same file as before, when the slot held one from this folder.
  let stem = ''
  const replaces = String(body.replaces ?? '').split(/[?#]/)[0] ?? ''
  if (replaces.startsWith(`${API_PREFIX}${folder}/`)) {
    const oldName = replaces.slice(`${API_PREFIX}${folder}/`.length)
    if (/^[\w-]+\.[a-z\d]+$/i.test(oldName) && await exists(path.join(dir, oldName))) {
      stem = oldName.replace(/\.[a-z\d]+$/i, '')
      if (!oldName.toLowerCase().endsWith(`.${extension}`)) {
        await fs.unlink(path.join(dir, oldName))
      }
    }
  }

  // Otherwise a readable name from the uploaded file's own, made unique.
  if (!stem) {
    const base = slug(fileName.replace(/\.[a-z\d]+$/i, '')) || 'image'
    stem = base
    for (let index = 2; await exists(path.join(dir, `${stem}.${extension}`)); index++) {
      stem = `${base}-${index}`
    }
  }

  const bytes = Buffer.from(body.content, 'base64')
  const name = `${stem}.${extension}`
  await fs.writeFile(path.join(dir, name), bytes)
  const version = createHash('sha256').update(bytes).digest('hex').slice(0, 8)
  return { path: `${API_PREFIX}${folder}/${name}?v=${version}` }
})
