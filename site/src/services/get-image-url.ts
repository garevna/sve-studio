import { CONTENT_API_ORIGIN } from './content-api-base'

export function getImageURL (src: string | undefined | null): string {
  if (!src || /^[a-z][\w+.-]*:/i.test(src)) {
    return src || ''
  }
  if (src.startsWith('/api/')) {
    return CONTENT_API_ORIGIN + src
  }
  return (typeof location === 'undefined' ? '' : location.origin) + src
}
