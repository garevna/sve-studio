// Core logic behind scripts/generate-manifest.mjs.
//
// The site's starting content lives in content/ (pages/, settings/,
// public/, styles/, images/), and content/manifest.json lists what is there -
// static hosting has no directory listing, so the browser side (the
// IndexedDB worker and the mock-API service worker) reads this instead.
import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SETTINGS_KEYS = ['global', 'palette', 'menu-content', 'seo']
const PUBLIC_KEYS = ['account-pages']
const IMAGE_EXTENSION = /\.(webp|avif|png|jpe?g|svg|gif)$/i

async function exists (targetPath) {
  return stat(targetPath).then(() => true).catch(() => false)
}

async function listFiles (dir, filter) {
  const names = await readdir(dir).catch(() => [])
  return names.filter(filter).toSorted()
}

// Every image under api/content/images, as a path relative to that folder
// ("about-company/03.webp"). The service worker uses this list to find a
// file when content asks for it without (or with a different) extension.
async function listImages (dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const result = []
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      result.push(...await listImages(path.join(dir, entry.name), relative))
    } else if (IMAGE_EXTENSION.test(entry.name)) {
      result.push(relative)
    }
  }
  return result.toSorted()
}

// The settings list keeps its original meaning (file keys the IndexedDB
// worker seeds), so account-pages stays in it even though
// it lives under content/public/.
// contentDir is the repo's content/ folder.
export async function regenerateManifest (contentDir) {

  const pages = (await listFiles(path.join(contentDir, 'pages'), name => name.endsWith('.json')))
    .map(name => name.replace(/\.json$/, ''))

  const settings = []
  for (const key of SETTINGS_KEYS) {
    if (await exists(path.join(contentDir, 'settings', `${key}.json`))) {
      settings.push(key)
    }
  }
  for (const key of PUBLIC_KEYS) {
    if (await exists(path.join(contentDir, 'public', `${key}.json`))) {
      settings.push(key)
    }
  }

  const styles = await listFiles(path.join(contentDir, 'styles'), name => name.endsWith('.css'))
  const images = await listImages(path.join(contentDir, 'images'))

  // A short fingerprint of every page, settings and style file, keyed by
  // its path under content/. The browser's local database compares these
  // on start and refreshes the files that changed here - see
  // refreshChangedSeedFiles in src/db/worker.ts.
  const hashes = {}
  const fingerprint = async relative => {
    const bytes = await readFile(path.join(contentDir, relative)).catch(() => null)
    if (bytes) hashes[relative] = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  }
  await Promise.all([
    ...pages.map(id => fingerprint(`pages/${id}.json`)),
    ...SETTINGS_KEYS.map(key => fingerprint(`settings/${key}.json`)),
    ...PUBLIC_KEYS.map(key => fingerprint(`public/${key}.json`)),
    ...styles.map(name => fingerprint(`styles/${name}`)),
  ])
  const sortedHashes = Object.fromEntries(Object.entries(hashes).toSorted(([a], [b]) => a.localeCompare(b)))

  const manifest = { pages, settings, styles, images, hashes: sortedHashes }
  await writeFile(path.join(contentDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}
