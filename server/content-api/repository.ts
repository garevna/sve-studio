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
  // Fingerprint (manifest.json hashes) of the starting file the saved body
  // was made from - see read().
  baseHash?: string
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
  // Dev: "Зберегти" writes the file in content/ as well, so the file IS the
  // saved version - a document that has one is read from it, and a fix made
  // in content/ by hand is not hidden by an older copy stored here.
  followSeed?: boolean
  // A published demo: when the release changes (any file's fingerprint in
  // manifest.json), every saved copy of a file the release has is dropped,
  // so the browser shows the new release whole. Documents that exist only
  // here, and images, stay.
  resetOnRelease?: boolean
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

// The type of a picture: by its extension - unless its bytes are SVG. The
// starting content has grey placeholder SVGs saved under .jpg/.png names
// (they stand in for pictures not shipped with the demo); sent as JPEG/PNG
// a browser shows them as broken.
function imageType (name: string, bytes: Uint8Array): string {
  const head = new TextDecoder().decode(bytes.subarray(0, 64)).trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && new TextDecoder().decode(bytes.subarray(0, 512)).includes('<svg'))) {
    return 'image/svg+xml'
  }
  return IMAGE_TYPES[extensionOf(name)] ?? 'application/octet-stream'
}

function stem (name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '')
}

function seedPath (kind: DocKind, name: string): string {
  return kind === 'styles' ? `styles/${name}` : `${kind}/${name}.json`
}

export function createContentRepository ({ seed, docs, images, followSeed = false, resetOnRelease = false }: ContentRepositoryOptions) {
  // The manifest rarely changes; re-read at most every few seconds.
  let manifestCache: { at: number, value: Promise<SeedManifest> } | null = null
  function manifest (): Promise<SeedManifest> {
    if (!manifestCache || Date.now() - manifestCache.at > 5000) {
      manifestCache = { at: Date.now(), value: readManifest(seed) }
    }
    return manifestCache.value
  }

  const key = (kind: DocKind, name: string) => `${kind}:${name}`

  // Checked once per run (see resetOnRelease).
  let releaseChecked: Promise<void> | null = null
  function takeNewRelease (): Promise<void> {
    if (!resetOnRelease) {
      return Promise.resolve()
    }
    releaseChecked ??= (async () => {
      const hashes = (await manifest()).hashes
      if (!hashes) {
        return
      }
      const signature = JSON.stringify(hashes)
      if (await docs.getItem<string>('meta:release') === signature) {
        return
      }
      for (const storedKey of await docs.getKeys()) {
        const [kind, ...rest] = storedKey.split(':')
        const name = rest.join(':')
        if (kind !== 'meta' && hashes[seedPath(kind as DocKind, name)]) {
          await docs.removeItem(storedKey)
        }
      }
      await docs.setItem('meta:release', signature)
    })().catch(() => {
      releaseChecked = null
    })
    return releaseChecked
  }

  async function record (kind: DocKind, name: string): Promise<DocRecord | null> {
    await takeNewRelease()
    return await docs.getItem<DocRecord>(key(kind, name))
  }

  // --- documents ---------------------------------------------------------

  async function read (kind: DocKind, name: string): Promise<string | null> {
    const stored = await record(kind, name)
    if (stored?.deleted) {
      return null
    }
    if (typeof stored?.body === 'string') {
      // A saved copy is read unless its starting file has had a new
      // release since the copy was made (or the copy is from before copies
      // remembered that): the release wins then. In a built demo the owner's
      // own browser otherwise kept showing pages saved there long after
      // newer versions were published. A page that exists only here (no
      // starting file) is always read from here.
      const hash = (await manifest()).hashes?.[seedPath(kind, name)]
      const newerRelease = !!hash && stored.baseHash !== hash
      const fromFile = followSeed || newerRelease ? await seed.readText(seedPath(kind, name)) : null
      return fromFile ?? stored.body
    }
    return seed.readText(seedPath(kind, name))
  }

  async function write (kind: DocKind, name: string, body: string): Promise<void> {
    const stored = await record(kind, name)
    const baseHash = (await manifest()).hashes?.[seedPath(kind, name)]
    await docs.setItem(key(kind, name), { ...stored, body, deleted: false, baseHash } satisfies DocRecord)
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
      return { bytes: uploaded, type: imageType(name, uploaded) }
    }
    // The exact file first - listed, or not in the (cached) manifest yet: a
    // picture the editor has just written into content/images in dev. Only
    // then a file of the same name with another extension (an old link
    // without one): before, a just-uploaded "01.png" not listed yet was
    // answered with the page's old "01.webp", so the editor showed a
    // different picture than the one uploaded.
    const exact = await seed.readBytes(`images/${name}`)
    if (exact) {
      return { bytes: exact, type: imageType(name, exact) }
    }
    const bundled = await findSeedImage(name)
    const bytes = bundled ? await seed.readBytes(`images/${bundled}`) : null
    return bundled && bytes ? { bytes, type: imageType(bundled, bytes) } : null
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
