import { sveRoot } from '../utils/sve-root'
import { CONTENT_API_ORIGIN } from './content-api-base'

export function getImageURL (src: string | undefined | null): string {
  if (!src || /^[a-z][\w+.-]*:/i.test(src)) {
    return src || ''
  }
  if (src.startsWith('/api/')) {
    // the API answers under the demo's root (sve-root.ts)
    return CONTENT_API_ORIGIN + (import.meta.env.PROD ? sveRoot().replace(/\/$/, '') : '') + src
  }
  return (typeof location === 'undefined' ? '' : location.origin) + src
}
