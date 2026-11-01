import { contentApiReachable } from '../utils/content-api-state'
import { sveRoot } from '../utils/sve-root'
import { CONTENT_API_ORIGIN } from './content-api-base'

export function getImageURL (src: string | undefined | null): string {
  if (!src || /^[a-z][\w+.-]*:/i.test(src)) {
    return src || ''
  }
  // Without the in-browser API in control (the first moments of a new
  // release, DevTools' "Bypass for network"...), /api/... gets no answer on
  // a static host: a picture of the release is read from the published
  // files instead. One uploaded in this browser has to wait for the API.
  if (import.meta.env.PROD && src.startsWith('/api/content/images/') && typeof location !== 'undefined' && (!contentApiReachable.value || !navigator.serviceWorker?.controller)) {
    return location.origin + sveRoot() + '_seed/images/' + src.slice('/api/content/images/'.length)
  }
  if (src.startsWith('/api/')) {
    // the API answers under the demo's root (sve-root.ts)
    return CONTENT_API_ORIGIN + (import.meta.env.PROD ? sveRoot().replace(/\/$/, '') : '') + src
  }
  return (typeof location === 'undefined' ? '' : location.origin) + src
}
