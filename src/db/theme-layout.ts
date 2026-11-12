// Where each starting-content file is served, relative to the app's base:
// the repo's content/ folder, published at /_seed (content/pages/x.json ->
// /_seed/pages/x.json). Its own path, so it never collides with /api.
//
// Callers keep using the short file names they always had
// ("dynamic-pages/x.json", "global.json", "styles/x.css", "manifest.json").
//
// NOTE: site/src/db/theme-layout.ts is an exact copy - keep
// the two identical.
const SETTINGS_KEYS = new Set(['global', 'palette', 'seo', 'menu-content', 'popups', 'client-api'])

export function themeFilePath (fileName: string): string {
  if (fileName === 'manifest.json') {
    return '_seed/manifest.json'
  }
  if (fileName.startsWith('dynamic-pages/')) {
    return `_seed/pages/${fileName.slice('dynamic-pages/'.length)}`
  }
  if (fileName.startsWith('styles/')) {
    return `_seed/${fileName}`
  }
  const key = fileName.replace(/\.json$/, '')
  return SETTINGS_KEYS.has(key)
    ? `_seed/settings/${key}.json`
    : `_seed/public/${key}.json`
}
