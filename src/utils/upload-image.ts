import axios from 'axios'
import { API_REQUEST_MODE } from '@/configs/api-mode'
import { useAjaxStore } from '@/stores/ajax'
import { useCommonStore } from '@/stores/common'
import { siteLocales } from '@/utils/locale-text'

export interface UploadImageOptions {
  // The value the slot held before this upload. In dev the new picture then
  // takes over that file instead of adding another one - see uploadToContent.
  replaces?: string
  // The blob: preview the caller has already put into the slot. It marks
  // WHERE in the page content the slot is, so copies of the old picture in
  // the same field's other locales count as this slot's own.
  preview?: string
  // content/images/<folder>/ - the page's own `id` by default.
  folder?: string
}

function readAsBase64 (file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const dataUrl = String(reader.result)
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

// The stored form of an image path: domain-relative, no ?v=. Slots often
// hand back the resolved, absolute URL (http://host/api/content/images/...),
// while the content stores /api/content/images/... - compared as stored.
function withoutQuery (value: string): string {
  const path = value.split(/[?#]/)[0] ?? ''
  return path.startsWith(location.origin) ? path.slice(location.origin.length) : path
}

// Where each occurrence of a value sits in the page content, as a path. A
// value under a locale key ({ uk, en, de }) is placed at the locale object
// itself: one field shown in several languages is one place.
function placesOf (content: unknown, matches: (value: string) => boolean): Set<string> {
  const locales = new Set(siteLocales())
  const places = new Set<string>()
  const walk = (node: unknown, path: string, key: string, parentPath: string) => {
    if (typeof node === 'string') {
      if (matches(node)) {
        places.add(locales.has(key) ? parentPath : path)
      }
    } else if (Array.isArray(node)) {
      for (const [index, item] of node.entries()) {
        walk(item, `${path}/${index}`, String(index), path)
      }
    } else if (node && typeof node === 'object') {
      for (const [childKey, value] of Object.entries(node)) {
        walk(value, `${path}/${childKey}`, childKey, path)
      }
    }
  }
  walk(content, '', '', '')
  return places
}

// Whether the new picture may overwrite the old file: only when nothing but
// this slot (in any of its languages) still shows it. Another block, a copy
// of this one, or the banner's other half using the same file keeps it, and
// the upload gets a new file instead.
function mayOverwrite (options: UploadImageOptions): boolean {
  if (!options.replaces) {
    return false
  }
  const content = useCommonStore().dynamicPageContent ?? {}
  const old = withoutQuery(options.replaces)
  const oldPlaces = placesOf(content, value => withoutQuery(value) === old)
  if (oldPlaces.size === 0) {
    return true
  }
  const own = options.preview ? placesOf(content, value => value === options.preview) : new Set<string>()
  return [...oldPlaces].every(place => own.has(place))
}

// After an overwrite: the slot's other languages showed the same file, and
// still carry the old ?v= - point them at the new version too, or they keep
// showing the old picture from the browser cache.
function retargetCopies (content: unknown, old: string, next: string) {
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const [index, item] of node.entries()) {
        if (typeof item === 'string' && withoutQuery(item) === old) {
          node[index] = next
        } else {
          walk(item)
        }
      }
    } else if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' && withoutQuery(value) === old) {
          record[key] = next
        } else {
          walk(value)
        }
      }
    }
  }
  walk(content)
}

// Dev: the picture goes straight into content/images/<page id>/ through the
// dev server (server/routes/__editor-api__/content-image.ts) - part of the
// starting content, next to the page that uses it, under a readable name.
// It does not depend on the browser's content API (service worker) at all,
// so a browser where that worker is bypassed or not running still saves it.
async function uploadToContent (file: File, options: UploadImageOptions): Promise<string> {
  const page = useCommonStore().dynamicPageContent as { id?: string } | undefined
  const overwrite = mayOverwrite(options)
  const response = await axios.post(`${location.origin}/__editor-api__/content-image`, {
    folder: options.folder || page?.id || 'site',
    fileName: file.name,
    content: await readAsBase64(file),
    replaces: overwrite && options.replaces ? withoutQuery(options.replaces) : undefined,
  })
  const path = response.data.path as string
  // The old file was this slot's alone, so every place still naming it is
  // the slot's own copy in another language (see mayOverwrite) - it follows
  // the new picture, including when the file changed extension.
  if (overwrite && options.replaces) {
    retargetCopies(page, withoutQuery(options.replaces), path)
  }
  return path
}

// Stored as returned: a domain-relative /api/content/images/... path, not an
// absolute URL, so the media domain can change without rewriting content -
// the origin is resolved at render time (ajax.ts getImageURL()).
export async function uploadImage (file: File, options: UploadImageOptions = {}): Promise<string> {
  if (import.meta.env.DEV) {
    return uploadToContent(file, options)
  }
  if (API_REQUEST_MODE === 'test') {
    throw new Error('Завантаження зображень недоступне: локальний API не запустився. Перезавантажте сторінку.')
  }

  // POST /content/images, matching docs/api-requirements.md.
  const formData = new FormData()
  formData.append('file', file)
  const response = await useAjaxStore().sendRequest({
    method: 'post',
    endpoint: '/content/images',
    data: formData as unknown as object,
    errorEvent: 'request-error',
  })
  return response.path as string
}
