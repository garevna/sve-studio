import { CONTENT_API_BASE } from './content-api-base'

// The hero's banners for one locale, from the same public endpoint
// production uses (/finance/banners - confirmed live: it answers with no
// Authorization header, and so do the images it points at).
//
// This preview otherwise asks nothing of the API beyond page content, and
// the search panel below the banner is deliberately a likeness with no
// requests at all. The banners are the exception, at the project owner's
// call: they are the CLIENT'S OWN content, and a stand-in picture in their
// place would misrepresent the top of the page badly enough to mislead the
// person looking at it. A control can be imitated; content cannot.
//
// Per locale AND per screen size, because the endpoint is: mobile banners
// are different images, not the same ones scaled.
export async function getHeroBanners (locale: string, mobile: boolean): Promise<string[]> {
  try {
    const response = await fetch(`${CONTENT_API_BASE}/finance/banners?locale=${locale}&mobile=${mobile ? 1 : 0}`)
    if (!response.ok) {
      return []
    }
    const data = await response.json() as { images?: unknown }
    if (!Array.isArray(data.images)) {
      return []
    }
    return data.images.map(id => `${CONTENT_API_BASE}/import/show/${id}`)
  } catch {
    // An empty list falls back to the theme's own bundled banner, exactly as
    // production does - there is nothing here for anyone to act on.
    return []
  }
}
