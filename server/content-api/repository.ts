// What the content API knows about pages, settings, styles and images -
// independent of HTTP and of where it runs.
//
// Two layers:
//   - the starting content (SeedSource, read-only);
//   - what was written through the API since (unstorage `docs` / `images`),
//     which shadows the seed: an edited page is read from storage, a deleted
//     one is remembered as deleted, an untouched one comes from the seed.
import type { Storage } from 'unstorage'
import type { SeedManifest, SeedSource } from './seed'
import { readManifest } from './seed'

export type DocKind = 'pages' | 'settings' | 'public' | 'styles'

interface DocRecord {
  body?: string
  deleted?: boolean
  visible?: boolean
}

export interface PageListItem {
  slug: string
  // the page's name in every site language (a plain string in older pages)
  title?: Record<string, string> | string
  visible: boolean
}

export interface ContentRepositoryOptions {
  seed: SeedSource
  docs: Storage
  images: Storage
}

const IMAGE_EXTENSION_PRIORITY = ['webp', 'avif', 'png', 'jpg', 'jpeg', 'svg', 'gif']
export const IMAGE_TYPES: Record<string, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  gif: 'image/gif',
}

function extensionOf (name: string): string {
  return (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
}

function stem (name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '')
}

function seedPath (kind: DocKind, name: string): string {
  return kind === 'styles' ? `styles/${name}` : `${kind}/${name}.json`
}

export function createContentRepository ({ seed, docs, images }: ContentRepositoryOptions) {
  // The manifest rarely changes; re-read at most every few seconds.
  let manifestCache: { at: number, value: Promise<SeedManifest> } | null = null
  function manifest (): Promise<SeedManifest> {
    if (!manifestCache || Date.now() - manifestCache.at > 5000) {
      manifestCache = { at: Date.now(), value: readManifest(seed) }
    }
    return manifestCache.value
  }

  const key = (kind: DocKind, name: string) => `${kind}:${name}`

  async function record (kind: DocKind, name: string): Promise<DocRecord | null> {
    return await docs.getItem<DocRecord>(key(kind, name))
  }

  // --- documents ---------------------------------------------------------

  async function read (kind: DocKind, name: string): Promise<string | null> {
    const stored = await record(kind, name)
    if (stored?.deleted) {
      return null
    }
    if (typeof stored?.body === 'string') {
      return stored.body
    }
    return seed.readText(seedPath(kind, name))
  }

  async function write (kind: DocKind, name: string, body: string): Promise<void> {
    const stored = await record(kind, name)
    await docs.setItem(key(kind, name), { ...stored, body, deleted: false } satisfies DocRecord)
  }

  async function remove (kind: DocKind, name: string): Promise<void> {
    const stored = await record(kind, name)
    await docs.setItem(key(kind, name), { visible: stored?.visible, deleted: true } satisfies DocRecord)
  }

  async function setVisible (slug: string, visible: boolean): Promise<void> {
    const stored = await record('pages', slug)
    await docs.setItem(key('pages', slug), { ...stored, visible } satisfies DocRecord)
  }

  // Seed pages plus pages created through the API, minus deleted ones.
  // footer-content(-*) is stored as a page but is not one.
  async function listPages (includeHidden: boolean): Promise<PageListItem[]> {
    const slugs = new Set((await manifest()).pages)
    for (const storedKey of await docs.getKeys('pages')) {
      slugs.add(storedKey.slice('pages:'.length))
    }
    const items: PageListItem[] = []
    for (const slug of [...slugs].sort()) {
      if (slug.startsWith('footer-content')) {
        continue
      }
      const stored = await record('pages', slug)
      if (stored?.deleted) {
        continue
      }
      const body = await read('pages', slug)
      if (body === null) {
        continue
      }
      let title: PageListItem['title']
      let hiddenInFile = false
      try {
        const page = JSON.parse(body) as { title?: PageListItem['title'], visible?: boolean }
        title = page.title
        // A page's own file can say it is hidden ("visible": false).
        hiddenInFile = page.visible === false
      } catch {
        // Listed without a title rather than not at all.
      }
      const visible = stored?.visible ?? !hiddenInFile
      if (!visible && !includeHidden) {
        continue
      }
      items.push({ slug, title, visible })
    }
    return items
  }

  async function listStyles (): Promise<string[]> {
    return (await manifest()).styles
  }

  // --- images ------------------------------------------------------------

  async function saveImage (name: string, bytes: Uint8Array): Promise<void> {
    await images.setItemRaw(name, bytes)
  }

  async function deleteImage (name: string): Promise<void> {
    await images.removeItem(name)
  }

  // Uploaded first; then the seed, found by name even without (or with a
  // different) extension - "about-company/03" finds 03.webp. null = none.
  async function readImage (name: string): Promise<{ bytes: Uint8Array, type: string } | null> {
    const uploaded = await images.getItemRaw<Uint8Array>(name)
    if (uploaded) {
      return { bytes: uploaded, type: IMAGE_TYPES[extensionOf(name)] ?? 'application/octet-stream' }
    }
    const bundled = await findSeedImage(name)
    const bytes = bundled ? await seed.readBytes(`images/${bundled}`) : null
    if (bundled && bytes) {
      return { bytes, type: IMAGE_TYPES[extensionOf(bundled)] ?? 'application/octet-stream' }
    }
    // Not in the (cached) manifest yet, or the manifest still names a file
    // that was just replaced - a picture the editor has just written into
    // content/images in dev. Asked for by its exact name.
    const fresh = await seed.readBytes(`images/${name}`)
    return fresh ? { bytes: fresh, type: IMAGE_TYPES[extensionOf(name)] ?? 'application/octet-stream' } : null
  }

  async function findSeedImage (name: string): Promise<string | null> {
    const list = (await manifest()).images
    if (list.includes(name)) {
      return name
    }
    const candidates = list.filter(image => stem(image) === stem(name))
    const rank = (image: string) => {
      const index = IMAGE_EXTENSION_PRIORITY.indexOf(extensionOf(image))
      return index === -1 ? IMAGE_EXTENSION_PRIORITY.length : index
    }
    return candidates.sort((a, b) => rank(a) - rank(b))[0] ?? null
  }

  return { read, write, remove, setVisible, listPages, listStyles, saveImage, deleteImage, readImage }
}

export type ContentRepository = ReturnType<typeof createContentRepository>
