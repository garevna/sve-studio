// Declarative IndexedDB schema, diffed against the live database on every
// worker boot (see db-worker.ts) so changing this file is enough to trigger
// migration - no manual version bumps, no hand-written upgrade steps.
export interface StoreIndexConfig {
  name: string
  keyPath: string
  unique?: boolean
}

export interface StoreConfig {
  name: string
  keyPath: string
  indexes?: StoreIndexConfig[]
}

export interface DbConfig {
  stores: StoreConfig[]
}

// pages: mirrors dynamic-pages/*.json, keyPath = pageId (e.g. "bus-park").
// settings: the singleton files, keyPath = 'global' | 'palette' | 'menu-content' | 'account-pages' | 'seo' | 'popups' | 'client-api'.
// styles: no folder structure at all - keyPath = bare file name including
//   extension (e.g. "buttons.css"). A "vuetify-" name prefix (not a path)
//   distinguishes the vuetify-component stylesheets from everything else -
//   this matches how a real server will eventually hand these files over
//   (by name only, no path), and is a small enough set that grouping by
//   prefix is done client-side rather than via a DB index.
// meta: worker-internal bookkeeping - schema fingerprint + seed status.
export const DB_CONFIG: DbConfig = {
  stores: [
    { name: 'pages', keyPath: 'pageId' },
    { name: 'settings', keyPath: 'key' },
    { name: 'styles', keyPath: 'name' },
    { name: 'meta', keyPath: 'key' },
  ],
}

export function dbNameForTheme (theme: number): string {
  return `editor-db-theme-${theme}`
}
