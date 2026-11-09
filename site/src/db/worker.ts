/// <reference lib="webworker" />
import type { DbRequestMessage, DbResponseMessage } from './protocol'
import { DB_CONFIG, dbNameForTheme } from './config'
import { themeFilePath } from './theme-layout'

declare const self: DedicatedWorkerGlobalScope

// source/seedHash: where the record's content came from. 'seed' - a copy of
// the starting file in content/, with that file's fingerprint (seedHash)
// at the time; refreshed automatically when the file changes there.
// 'edit' - saved by the editor, keeping the fingerprint of the file it was
// made from (seedHash); a newer release of that file replaces it (see
// refreshChangedSeedFiles), a draft never. Records from before this field
// have neither and are replaced by the current release unless they hold a
// draft.
interface SeedOrigin { source?: 'seed' | 'edit', seedHash?: string }
interface PageRecord extends SeedOrigin { pageId: string, content: unknown, updated?: boolean, visible?: boolean }
interface SettingsRecord extends SeedOrigin { key: string, content: unknown, updated?: boolean }
interface StyleRecord extends SeedOrigin { name: string, content: string, updated?: boolean }
interface ManifestModel { pages: string[], settings: string[], styles: string[], images?: string[], hashes?: Record<string, string> }

// Set once on {route:"db", action:"init"} - reused by undo() below so the
// client doesn't have to keep re-sending the theme on every request.
let activeTheme = 0
// The app's base URL, sent by the page with the init message.
let appBaseUrl = ''

// Files listed in manifest.json that could not be seeded (missing or broken).
// Reported back with the init response so the editor can tell the user.
const seedSkipped = new Set<string>()

function publicBaseUrl (): string {
  // Starting content is served at <base>_seed/ (see theme-layout.ts).
  return `${self.location.origin}${appBaseUrl || (import.meta.env.DEV ? '/' : import.meta.env.VITE_BASE_PATH)}`
}

// Bundled seed file for this theme - see theme-layout.ts for the folder layout.
function fileUrl (fileName: string): string {
  return publicBaseUrl() + themeFilePath(fileName)
}

// pages/settings fetch .json() - if a 404 gets silently answered with
// index.html (dev-server SPA fallback, or a similar prod misconfiguration),
// JSON.parse just throws and the caller sees a real rejection. Styles fetch
// .text() instead (CSS isn't JSON), which accepts literally any response
// body with no validation at all - confirmed live: theme_2's vuetify-*.css
// records ended up holding raw "<!doctype html>..." after exactly this kind
// of 404, silently corrupting the editor's own local styles. Every styles
// fetch below checks this before it's allowed anywhere near putRecord().
function looksLikeHtml (text: string): boolean {
  return /^\s*<(!doctype html|html[\s>])/i.test(text)
}

// --- Small IDBRequest -> Promise helpers (no `idb` dependency needed) ---

function requestToPromise<T> (request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function openRequest (request: IDBOpenDBRequest, onUpgrade?: (db: IDBDatabase, tx: IDBTransaction) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (onUpgrade) {
      request.onupgradeneeded = () => {
        const db = request.result
        const tx = request.transaction
        if (tx) {
          onUpgrade(db, tx)
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open connection'))
  })
}

function getRecord<T> (db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  const tx = db.transaction(storeName, 'readonly')
  return requestToPromise(tx.objectStore(storeName).get(key))
}

function putRecord (db: IDBDatabase, storeName: string, value: unknown): Promise<IDBValidKey> {
  const tx = db.transaction(storeName, 'readwrite')
  return requestToPromise(tx.objectStore(storeName).put(value))
}

function deleteRecord (db: IDBDatabase, storeName: string, key: string): Promise<undefined> {
  const tx = db.transaction(storeName, 'readwrite')
  return requestToPromise(tx.objectStore(storeName).delete(key))
}

function getAllKeys (db: IDBDatabase, storeName: string): Promise<string[]> {
  const tx = db.transaction(storeName, 'readonly')
  return requestToPromise(tx.objectStore(storeName).getAllKeys()) as Promise<string[]>
}

function getAllRecords<T> (db: IDBDatabase, storeName: string): Promise<T[]> {
  const tx = db.transaction(storeName, 'readonly')
  return requestToPromise(tx.objectStore(storeName).getAll()) as Promise<T[]>
}

function countStore (db: IDBDatabase, storeName: string): Promise<number> {
  const tx = db.transaction(storeName, 'readonly')
  return requestToPromise(tx.objectStore(storeName).count())
}

// --- Schema migration ---

function migrateStores (db: IDBDatabase, tx: IDBTransaction) {
  const configByName = new Map(DB_CONFIG.stores.map(store => [store.name, store]))

  for (const name of db.objectStoreNames) {
    if (!configByName.has(name)) {
      db.deleteObjectStore(name)
    }
  }

  for (const store of DB_CONFIG.stores) {
    if (db.objectStoreNames.contains(store.name)) {
      const objectStore = tx.objectStore(store.name)
      const wantedIndexNames = new Set((store.indexes ?? []).map(index => index.name))
      const actualIndexNames = new Set(objectStore.indexNames)
      const keyPathMatches = objectStore.keyPath === store.keyPath
      const indexesMatch = actualIndexNames.size === wantedIndexNames.size
        && [...wantedIndexNames].every(name => actualIndexNames.has(name))
      if (keyPathMatches && indexesMatch) {
        continue
      }
      // keyPath/indexes changed - IndexedDB can't alter these in place,
      // so drop and recreate; seedIfEmpty() refills it afterwards.
      db.deleteObjectStore(store.name)
    }
    const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath })
    for (const index of store.indexes ?? []) {
      objectStore.createIndex(index.name, index.keyPath, { unique: !!index.unique })
    }
  }
}

async function openDb (theme: number): Promise<IDBDatabase> {
  const name = dbNameForTheme(theme)
  const configString = JSON.stringify(DB_CONFIG)

  // Probe at whatever version currently exists (creates an empty v1 shell
  // if the database is brand new - onupgradeneeded here is a no-op, the
  // real store setup always happens in the migration reopen below).
  const probe = await openRequest(indexedDB.open(name))
  const currentVersion = probe.version
  const hasMetaStore = probe.objectStoreNames.contains('meta')
  const storedConfig = hasMetaStore
    ? (await getRecord<{ key: string, value: string }>(probe, 'meta', 'schema'))?.value ?? null
    : null

  if (storedConfig === configString) {
    return probe
  }
  probe.close()

  return openRequest(indexedDB.open(name, currentVersion + 1), (db, tx) => {
    migrateStores(db, tx)
    tx.objectStore('meta').put({ key: 'schema', value: configString })
  })
}

// --- Seeding (first run / after a store got recreated by migration) ---

function settingsFileName (key: string): string {
  if (key === 'global') {
    return 'global.json'
  }
  if (key === 'palette') {
    return 'palette.json'
  }
  if (key === 'menu-content') {
    return 'menu-content.json'
  }
  if (key === 'account-pages') {
    return 'account-pages.json'
  }
  if (key === 'seo') {
    return 'seo.json'
  }
  // The site's popups - windows any of its buttons can open.
  if (key === 'popups') {
    return 'popups.json'
  }
  throw new Error(`Unknown settings key: ${key}`)
}

async function seedIfEmpty (db: IDBDatabase, theme: number): Promise<void> {
  const [pagesEmpty, settingsEmpty, stylesEmpty] = await Promise.all([
    countStore(db, 'pages').then(count => count === 0),
    countStore(db, 'settings').then(count => count === 0),
    countStore(db, 'styles').then(count => count === 0),
  ])
  if (!pagesEmpty && !settingsEmpty && !stylesEmpty) {
    return
  }
  // no-store: seeding is exactly the moment freshness matters most (public/
  // is hand-edited during development) - the browser's default heuristic
  // HTTP caching (Vite's dev server doesn't send no-cache headers for
  // public/ files) can otherwise silently serve content from before the
  // last edit, well after the on-disk file has changed.
  const manifest = await (await fetch(fileUrl('manifest.json'), { cache: 'no-store' })).json() as ManifestModel

  const tasks: Promise<unknown>[] = []
  if (pagesEmpty) {
    for (const pageId of manifest.pages) {
      tasks.push(
        fetch(fileUrl(`dynamic-pages/${pageId}.json`), { cache: 'no-store' })
          .then(response => response.json())
          // A page file can say it is hidden ("visible": false).
          .then(content => putRecord(db, 'pages', { pageId, content, visible: (content as { visible?: boolean })?.visible !== false, ...seedOrigin(manifest, `pages/${pageId}.json`) } satisfies PageRecord))
          .catch(error => {
            seedSkipped.add(`pages/${pageId}.json`)
            console.warn(`seedIfEmpty: skipped page "${pageId}" (listed in manifest.json, but missing or not valid JSON)`, error)
          }),
      )
    }
  }
  if (settingsEmpty) {
    for (const key of manifest.settings) {
      tasks.push(
        fetch(fileUrl(settingsFileName(key)), { cache: 'no-store' })
          .then(response => response.json())
          .then(content => putRecord(db, 'settings', { key, content, ...seedOrigin(manifest, settingsSeedPath(key)) } satisfies SettingsRecord))
          .catch(error => {
            seedSkipped.add(settingsFileName(key))
            console.warn(`seedIfEmpty: skipped settings "${key}" (listed in manifest.json, but missing or not valid JSON)`, error)
          }),
      )
    }
  }
  if (stylesEmpty) {
    for (const name of manifest.styles) {
      tasks.push(
        fetch(fileUrl(`styles/${name}`), { cache: 'no-store' })
          .then(response => response.text())
          .then(content => {
            if (looksLikeHtml(content)) {
              // Leave this one record out rather than seed it with garbage -
              // readStyleFileLocal's own public-file fallback (ajax.ts)
              // covers a style with no IndexedDB record yet, so this fails
              // safe instead of poisoning the store.
              seedSkipped.add(`styles/${name}`)
              console.error(`seedIfEmpty: "${name}" fetched as HTML, not CSS - skipping (left unseeded)`)
              return
            }
            return putRecord(db, 'styles', { name, content, ...seedOrigin(manifest, `styles/${name}`) } satisfies StyleRecord)
          })
          .catch(error => {
            seedSkipped.add(`styles/${name}`)
            console.warn(`seedIfEmpty: skipped style "${name}"`, error)
          }),
      )
    }
  }
  await Promise.all(tasks)
}

// seedIfEmpty only ever runs its bulk fill once, the very first time a
// store is empty - a page added to disk (and registered in manifest.json)
// afterwards, in an already-seeded environment, would otherwise never
// appear: listDynamicPages() reads IndexedDB, not the filesystem, and
// nothing else re-checks manifest.json against what's already there. This
// runs on every init instead, comparing manifest.pages against what's
// already in the store and fetching only the gap - cheap (one manifest
// fetch + a key-only read) when there's nothing new. Each fetch is
// isolated in its own catch so one missing/broken file (e.g. a stale
// manifest entry for a page deleted by hand rather than through the
// editor) can't fail the others via a shared Promise.all rejection.
// Styles have the same latent gap but aren't fixed here - a new style file
// is a much rarer event than a new page/settings key (the whole set is
// fixed by the theme's frontend build - see docs/api-requirements.md), so
// it hasn't been the problem actually hit yet.
async function seedMissingPages (db: IDBDatabase): Promise<void> {
  const manifest = await (await fetch(fileUrl('manifest.json'), { cache: 'no-store' })).json() as ManifestModel
  const existingPageIds = new Set(await getAllKeys(db, 'pages'))

  await Promise.all(
    manifest.pages
      .filter(pageId => !existingPageIds.has(pageId))
      .map(pageId =>
        fetch(fileUrl(`dynamic-pages/${pageId}.json`), { cache: 'no-store' })
          .then(response => response.json())
          // A page file can say it is hidden ("visible": false).
          .then(content => putRecord(db, 'pages', { pageId, content, visible: (content as { visible?: boolean })?.visible !== false, ...seedOrigin(manifest, `pages/${pageId}.json`) } satisfies PageRecord))
          .catch(error => {
            seedSkipped.add(`pages/${pageId}.json`)
            console.warn(`seedMissingPages: failed to seed "${pageId}" from manifest.json`, error)
          }),
      ),
  )
}

// Same gap, same fix, for the settings store - hit for real once seo.json
// was added to manifest.json's settings list after this editor's IndexedDB
// had already been seeded from an earlier session: seedIfEmpty only fills a
// store the very first time it's completely empty, so a settings key added
// later in an already-seeded environment silently never arrives, and
// getSeoSettings() would keep resolving to null forever without this.
async function seedMissingSettings (db: IDBDatabase): Promise<void> {
  const manifest = await (await fetch(fileUrl('manifest.json'), { cache: 'no-store' })).json() as ManifestModel
  const existingKeys = new Set(await getAllKeys(db, 'settings'))

  await Promise.all(
    manifest.settings
      .filter(key => !existingKeys.has(key))
      .map(key =>
        fetch(fileUrl(settingsFileName(key)), { cache: 'no-store' })
          .then(response => response.json())
          .then(content => putRecord(db, 'settings', { key, content, ...seedOrigin(manifest, settingsSeedPath(key)) } satisfies SettingsRecord))
          .catch(error => {
            seedSkipped.add(settingsFileName(key))
            console.warn(`seedMissingSettings: failed to seed "${key}" from manifest.json`, error)
          }),
      ),
  )
}

// Same for stylesheets: a file added to content/styles after this database
// was filled (cards.css, for the UI Kit's card styles) would otherwise never
// reach it - only an EMPTY styles store is seeded.
async function seedMissingStyles (db: IDBDatabase): Promise<void> {
  const manifest = await (await fetch(fileUrl('manifest.json'), { cache: 'no-store' })).json() as ManifestModel
  const existingNames = new Set(await getAllKeys(db, 'styles'))

  await Promise.all(
    manifest.styles
      .filter(name => !existingNames.has(name))
      .map(name =>
        fetch(fileUrl(`styles/${name}`), { cache: 'no-store' })
          .then(response => response.text())
          .then(content => {
            if (looksLikeHtml(content)) {
              seedSkipped.add(`styles/${name}`)
              return
            }
            return putRecord(db, 'styles', { name, content, ...seedOrigin(manifest, `styles/${name}`) } satisfies StyleRecord)
          })
          .catch(error => {
            seedSkipped.add(`styles/${name}`)
            console.warn(`seedMissingStyles: failed to seed "${name}" from manifest.json`, error)
          }),
      ),
  )
}

// Path of a settings file under content/ - the key the manifest's
// fingerprints use.
function settingsSeedPath (key: string): string {
  return key === 'account-pages' ? `public/${key}.json` : `settings/${key}.json`
}

function seedOrigin (manifest: ManifestModel, seedPath: string): SeedOrigin {
  return { source: 'seed', seedHash: manifest.hashes?.[seedPath] }
}

// A starting file edited in content/ after this database was filled used
// to stay stale here until the database was deleted - which also deleted
// every unsaved draft. Runs on every start instead: each record (no draft)
// is compared with its file's fingerprint in manifest.json and fetched
// again when the file has changed since the version the record holds or
// was saved from (seedHash - a save keeps the fingerprint it started from).
// So a new release of a page replaces a copy saved in this browser from an
// older one; a record saved before saves kept it has none, and a release
// replaces it too. Drafts (`updated`) are never touched.
async function refreshChangedSeedFiles (db: IDBDatabase): Promise<void> {
  const manifest = await (await fetch(fileUrl('manifest.json'), { cache: 'no-store' })).json() as ManifestModel
  const hashes = manifest.hashes
  if (!hashes) {
    return
  }
  // Earlier a record published in the browser was never followed in a
  // built demo, so the owner's own browser kept showing pages saved there
  // long after newer versions were released. Now the release wins over a
  // save made from an older version; drafts still win over everything.
  const stale = (record: (SeedOrigin & { updated?: boolean }) | undefined, seedPath: string) =>
    !!record && !record.updated && !!hashes[seedPath] && record.seedHash !== hashes[seedPath]

  const tasks: Promise<unknown>[] = []
  for (const pageId of manifest.pages) {
    const seedPath = `pages/${pageId}.json`
    tasks.push(getRecord<PageRecord>(db, 'pages', pageId).then(async record => {
      if (!stale(record, seedPath)) {
        return
      }
      const content = await fetch(fileUrl(`dynamic-pages/${pageId}.json`), { cache: 'no-store' }).then(response => response.json())
      const hiddenInFile = (content as { visible?: boolean })?.visible === false
      await putRecord(db, 'pages', { pageId, content, visible: hiddenInFile ? false : (record?.visible ?? true), ...seedOrigin(manifest, seedPath) } satisfies PageRecord)
    }).catch(error => console.warn(`refreshChangedSeedFiles: page "${pageId}"`, error)))
  }
  for (const key of manifest.settings) {
    const seedPath = settingsSeedPath(key)
    tasks.push(getRecord<SettingsRecord>(db, 'settings', key).then(async record => {
      if (!stale(record, seedPath)) {
        return
      }
      const content = await fetch(fileUrl(settingsFileName(key)), { cache: 'no-store' }).then(response => response.json())
      await putRecord(db, 'settings', { key, content, ...seedOrigin(manifest, seedPath) } satisfies SettingsRecord)
    }).catch(error => console.warn(`refreshChangedSeedFiles: settings "${key}"`, error)))
  }
  for (const name of manifest.styles) {
    const seedPath = `styles/${name}`
    tasks.push(getRecord<StyleRecord>(db, 'styles', name).then(async record => {
      if (!stale(record, seedPath)) {
        return
      }
      const content = await fetch(fileUrl(seedPath), { cache: 'no-store' }).then(response => response.text())
      if (looksLikeHtml(content)) {
        return
      }
      await putRecord(db, 'styles', { name, content, ...seedOrigin(manifest, seedPath) } satisfies StyleRecord)
    }).catch(error => console.warn(`refreshChangedSeedFiles: style "${name}"`, error)))
  }
  await Promise.all(tasks)
}

// A published demo takes every new release whole: when the repository's
// content changes (the release signature - built from every file's
// fingerprint in manifest.json - differs from the one this browser last
// took), each page, settings file and stylesheet of the release overwrites
// the local copy, drafts and saves included. A page that exists only in
// this browser stays. Not in development: there "Зберегти" writes the
// files themselves, and drafts must survive a manifest rebuild.
function releaseSignature (manifest: ManifestModel): string {
  const text = JSON.stringify(manifest.hashes ?? manifest)
  let hash = 5381
  for (let index = 0; index < text.length; index++) {
    hash = ((hash * 33) ^ text.codePointAt(index)!) >>> 0
  }
  return hash.toString(16)
}

async function takeNewRelease (db: IDBDatabase): Promise<void> {
  if (import.meta.env.DEV) {
    return
  }
  const manifest = await (await fetch(fileUrl('manifest.json'), { cache: 'no-store' })).json() as ManifestModel
  const signature = releaseSignature(manifest)
  const taken = (await getRecord<{ key: string, value: string }>(db, 'meta', 'release'))?.value
  if (taken === signature) {
    return
  }
  const tasks: Promise<unknown>[] = []
  for (const pageId of manifest.pages) {
    const seedPath = `pages/${pageId}.json`
    tasks.push(fetch(fileUrl(`dynamic-pages/${pageId}.json`), { cache: 'no-store' })
      .then(response => response.json())
      .then(content => putRecord(db, 'pages', { pageId, content, visible: (content as { visible?: boolean })?.visible !== false, ...seedOrigin(manifest, seedPath) } satisfies PageRecord))
      .catch(error => console.warn(`takeNewRelease: page "${pageId}"`, error)))
  }
  for (const key of manifest.settings) {
    tasks.push(fetch(fileUrl(settingsFileName(key)), { cache: 'no-store' })
      .then(response => response.json())
      .then(content => putRecord(db, 'settings', { key, content, ...seedOrigin(manifest, settingsSeedPath(key)) } satisfies SettingsRecord))
      .catch(error => console.warn(`takeNewRelease: settings "${key}"`, error)))
  }
  for (const name of manifest.styles) {
    const seedPath = `styles/${name}`
    tasks.push(fetch(fileUrl(seedPath), { cache: 'no-store' })
      .then(response => response.text())
      .then(content => looksLikeHtml(content) ? undefined : putRecord(db, 'styles', { name, content, ...seedOrigin(manifest, seedPath) } satisfies StyleRecord))
      .catch(error => console.warn(`takeNewRelease: style "${name}"`, error)))
  }
  await Promise.all(tasks)
  await putRecord(db, 'meta', { key: 'release', value: signature })
}

// Palette keys of the removed booking wizard. A palette saved in a browser
// before they left content/settings/palette.json still carries them (and
// may lack keys added since): they are dropped and the missing ones taken
// from the file, the rest of the visitor's colours kept as they are.
const RETIRED_PALETTE_KEYS = [
  'active-seat-border', 'booked-seat-background', 'booked-seat-color', 'booked-seat-active-border',
  'extra-seat-background', 'recommended-seat-border', 'not-available-seat-background',
  'not-available-seat-color', 'not-available-seat-border',
]

async function dropRetiredPaletteKeys (db: IDBDatabase): Promise<void> {
  const record = await getRecord<SettingsRecord>(db, 'settings', 'palette')
  const content = record?.content as Record<string, string> | undefined
  if (!record || !content || !RETIRED_PALETTE_KEYS.some(key => key in content)) {
    return
  }
  const fromFile = await fetch(fileUrl('palette.json'), { cache: 'no-store' }).then(response => response.json()).catch(() => ({})) as Record<string, string>
  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...fromFile, ...content })) {
    if (!RETIRED_PALETTE_KEYS.includes(key) && !RETIRED_PALETTE_KEYS.some(retired => value?.includes?.(`var(--${retired})`))) {
      cleaned[key] = value
    }
  }
  await putRecord(db, 'settings', { ...record, content: cleaned })
}

// --- Route handlers ---

// data.published distinguishes a live in-progress edit (autosave, keeps
// updated:true so it's known to differ from the public/ baseline and shows
// up in the Undo button) from the explicit "Зберегти" click (published:true,
// the file is - today, nominally; later, for real via the API - considered
// sent, so updated resets to false).
async function handlePages (db: IDBDatabase, action: string, data: { pageId?: string, content?: unknown, published?: boolean, visible?: boolean }): Promise<unknown> {
  if (action === 'get') {
    const record = await getRecord<PageRecord>(db, 'pages', data.pageId as string)
    return record?.content ?? null
  }
  if (action === 'save') {
    // A content save must not silently reset a previously-set visible flag -
    // visible is independent metadata (see the "set-visible" action below,
    // matching a real API's own PATCH .../visibility being separate from
    // PUT .../content), so it has to be read and carried forward here.
    const existing = await getRecord<PageRecord>(db, 'pages', data.pageId as string)
    await putRecord(db, 'pages', { pageId: data.pageId as string, content: data.content, updated: !data.published, visible: existing?.visible ?? true, source: 'edit', seedHash: existing?.seedHash } satisfies PageRecord)
    return { ok: true }
  }
  if (action === 'set-visible') {
    const existing = await getRecord<PageRecord>(db, 'pages', data.pageId as string)
    // Also in the page's own content, so the next publish writes it to the
    // page's file and the site (which reads the content) knows it too.
    const content = existing?.content && typeof existing.content === 'object' ? { ...existing.content, visible: data.visible } : existing?.content
    await putRecord(db, 'pages', { pageId: data.pageId as string, content, updated: existing?.updated, visible: data.visible, source: existing?.source, seedHash: existing?.seedHash } satisfies PageRecord)
    return { ok: true }
  }
  if (action === 'status') {
    const record = await getRecord<PageRecord>(db, 'pages', data.pageId as string)
    return { updated: !!record?.updated }
  }
  if (action === 'undo') {
    const content = await fetch(fileUrl(`dynamic-pages/${data.pageId}.json`), { cache: 'no-store' }).then(response => response.json())
    const existing = await getRecord<PageRecord>(db, 'pages', data.pageId as string)
    await putRecord(db, 'pages', { pageId: data.pageId as string, content, updated: false, visible: existing?.visible ?? true } satisfies PageRecord)
    return content
  }
  if (action === 'list') {
    const records = await getAllRecords<PageRecord>(db, 'pages')
    return records
      .filter(record => !record.pageId.startsWith('footer-content'))
      .map(record => ({ pageId: record.pageId, title: (record.content as { title?: unknown } | null)?.title, visible: record.visible ?? true }))
  }
  if (action === 'delete') {
    await deleteRecord(db, 'pages', data.pageId as string)
    return { ok: true }
  }
  throw new Error(`Unknown action for route "pages": ${action}`)
}

async function handleSettings (db: IDBDatabase, action: string, data: { key?: string, content?: unknown, published?: boolean }): Promise<unknown> {
  if (action === 'get') {
    const record = await getRecord<SettingsRecord>(db, 'settings', data.key as string)
    return record?.content ?? null
  }
  if (action === 'save') {
    const existing = await getRecord<SettingsRecord>(db, 'settings', data.key as string)
    await putRecord(db, 'settings', { key: data.key as string, content: data.content, updated: !data.published, source: 'edit', seedHash: existing?.seedHash } satisfies SettingsRecord)
    return { ok: true }
  }
  if (action === 'status') {
    const record = await getRecord<SettingsRecord>(db, 'settings', data.key as string)
    return { updated: !!record?.updated }
  }
  if (action === 'undo') {
    const content = await fetch(fileUrl(settingsFileName(data.key as string)), { cache: 'no-store' }).then(response => response.json())
    await putRecord(db, 'settings', { key: data.key as string, content, updated: false } satisfies SettingsRecord)
    return content
  }
  throw new Error(`Unknown action for route "settings": ${action}`)
}

async function handleStyles (db: IDBDatabase, action: string, data: { name?: string, content?: string, published?: boolean }): Promise<unknown> {
  if (action === 'get') {
    const record = await getRecord<StyleRecord>(db, 'styles', data.name as string)
    return record?.content ?? null
  }
  if (action === 'save') {
    const existing = await getRecord<StyleRecord>(db, 'styles', data.name as string)
    await putRecord(db, 'styles', { name: data.name as string, content: data.content as string, updated: !data.published, source: 'edit', seedHash: existing?.seedHash } satisfies StyleRecord)
    return { ok: true }
  }
  if (action === 'status') {
    const record = await getRecord<StyleRecord>(db, 'styles', data.name as string)
    return { updated: !!record?.updated }
  }
  if (action === 'undo') {
    const content = await fetch(fileUrl(`styles/${data.name}`), { cache: 'no-store' }).then(response => response.text())
    if (looksLikeHtml(content)) {
      // Reject instead of saving - the caller (ajax.ts's undoStyleFile) sees
      // a real rejection it can surface, same as any other failed request,
      // instead of this silently overwriting a real style with garbage.
      throw new Error(`"${data.name}" fetched as HTML, not CSS - the public file may be missing or the dev server served its SPA fallback`)
    }
    await putRecord(db, 'styles', { name: data.name as string, content, updated: false } satisfies StyleRecord)
    return content
  }
  if (action === 'list') {
    return getAllKeys(db, 'styles')
  }
  throw new Error(`Unknown action for route "styles": ${action}`)
}

// --- Message loop ---

let dbPromise: Promise<IDBDatabase> | null = null

function respond (message: DbResponseMessage) {
  self.postMessage(message)
}

self.onmessage = async (event: MessageEvent<DbRequestMessage>) => {
  const { id, route, action, data } = event.data
  try {
    if (route === 'db' && action === 'init') {
      const theme = (data as { theme: number }).theme
      appBaseUrl = (data as { base?: string }).base || ''
      activeTheme = theme
      dbPromise = openDb(theme).then(async db => {
        await seedIfEmpty(db, theme)
        await seedMissingPages(db)
        await seedMissingSettings(db)
        await seedMissingStyles(db)
        await refreshChangedSeedFiles(db)
        await takeNewRelease(db).catch(error => console.warn('takeNewRelease', error))
        await dropRetiredPaletteKeys(db).catch(error => console.warn('dropRetiredPaletteKeys', error))
        return db
      })
      await dbPromise
      respond({ id, route, action, data: { ready: true, skipped: [...seedSkipped] } })
      return
    }

    if (!dbPromise) {
      throw new Error('DB not initialized - send {route:"db", action:"init"} first')
    }
    const db = await dbPromise

    let result: unknown
    switch (route) {
      case 'pages': {
        result = await handlePages(db, action, data as never)
        break
      }
      case 'settings': {
        result = await handleSettings(db, action, data as never)
        break
      }
      case 'styles': {
        result = await handleStyles(db, action, data as never)
        break
      }
      default: { throw new Error(`Unknown route: ${route}`)
      }
    }

    respond({ id, route, action, data: result })
  } catch (error) {
    respond({ id, route, action, error: error instanceof Error ? error.message : String(error) })
  }
}
