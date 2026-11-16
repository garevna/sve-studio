import { sveRoot } from '../utils/sve-root'
import { themeFilePath } from './theme-layout'

// The published site: the owner's own site, read from the released files
// (<root>_seed/, made from content/) and nothing else. No browser database,
// no visitor's drafts - what the demo's visitors change in the editor never
// reaches it, so the demo lives on its own.
//
// It answers the same requests the browser database answers (db/client.ts),
// as far as the site asks them (services/site-data.ts, the style loaders).

interface Manifest {
  pages: string[]
}

const cache = new Map<string, Promise<unknown>>()

function fileUrl (fileName: string): string {
  const origin = typeof location === 'undefined' ? '' : location.origin
  return `${origin}${sveRoot()}${themeFilePath(fileName)}`
}

// One fetch per file for the whole visit; a missing file is null.
function load<T> (fileName: string, as: 'json' | 'text' = 'json'): Promise<T | null> {
  const key = `${as}:${fileName}`
  if (!cache.has(key)) {
    cache.set(key, fetch(fileUrl(fileName)).then(response => {
      if (!response.ok) {
        return null
      }
      return as === 'json' ? response.json() : response.text()
    }).catch(() => null))
  }
  return cache.get(key) as Promise<T | null>
}

async function pages (action: string, data: { pageId?: string }): Promise<unknown> {
  if (action === 'get') {
    return load(`dynamic-pages/${data.pageId}.json`)
  }
  if (action === 'list') {
    const manifest = await load<Manifest>('manifest.json')
    const ids = (manifest?.pages ?? []).filter(id => !id.startsWith('footer-content'))
    const contents = await Promise.all(ids.map(id => load<{ title?: unknown, visible?: boolean }>(`dynamic-pages/${id}.json`)))
    return ids.map((pageId, index) => ({ pageId, title: contents[index]?.title, visible: contents[index]?.visible !== false }))
  }
  throw new Error(`The published site does not ${action} pages`)
}

export async function publishedRequest<T> (route: string, action: string, data?: unknown): Promise<T> {
  const asked = (data ?? {}) as { pageId?: string, key?: string, name?: string }
  if (route === 'pages') {
    return pages(action, asked) as Promise<T>
  }
  if (route === 'settings' && action === 'get') {
    return load(`${asked.key}.json`) as Promise<T>
  }
  if (route === 'styles' && action === 'get') {
    return load(`styles/${asked.name}`, 'text') as Promise<T>
  }
  throw new Error(`The published site does not answer ${route}/${action}`)
}
