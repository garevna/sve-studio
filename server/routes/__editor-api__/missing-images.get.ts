// Dev only: the uploaded images (/api/content/images/<name>) that the JSON
// in content/ refers to but content/images does not hold - they live only
// in some browser's content-API storage. The editor copies them over (see
// src/utils/dev-content-images.ts). In a production build: 404.
import { promises as fs } from 'node:fs'
import path from 'node:path'

const IMAGE_REF = /\/api\/content\/images\/((?:[\w-]+\/)*[\w-]+\.(?:jpe?g|png|svg|webp|gif|avif))/gi

async function jsonFiles (dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const result: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...await jsonFiles(full))
    } else if (entry.name.endsWith('.json') && entry.name !== 'manifest.json') {
      result.push(full)
    }
  }
  return result
}

export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const contentDir = path.resolve(process.cwd(), 'content')
  const names = new Set<string>()
  for (const file of await jsonFiles(contentDir)) {
    const text = await fs.readFile(file, 'utf8')
    for (const match of text.matchAll(IMAGE_REF)) {
      names.add(match[1]!)
    }
  }
  const missing: string[] = []
  for (const name of names) {
    const exists = await fs.access(path.join(contentDir, 'images', name)).then(() => true, () => false)
    if (!exists) {
      missing.push(name)
    }
  }
  return { missing: missing.toSorted() }
})
