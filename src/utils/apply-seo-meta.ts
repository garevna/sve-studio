import type { SeoSettingsModel } from '@/types/SeoSettingsModel'
import type { TemplatePageModel } from '@/types/TemplateBlockModel'

function setMetaTag (attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let tag = document.querySelector<HTMLMetaElement>(selector)
  if (!content) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.append(tag)
  }
  tag.setAttribute('content', content)
}

// Applies one page's resolved SEO values to the live document - <title>,
// meta description, og:*, robots. This is what actually makes metadata
// differ per page (see docs/api-requirements.md's PageContent.seo /
// SeoSettingsModel) - production doesn't have an equivalent mechanism yet
// (the original apps never set any of this dynamically),
// so PreviewView.vue calling this is the closest real proof the feature
// does something, ahead of that landing in the actual site.
export function applySeoMeta (
  page: TemplatePageModel | null | undefined,
  seoSettings: SeoSettingsModel | null | undefined,
  resolveImageUrl: (src: string) => string,
) {
  if (!seoSettings) {
    return
  }

  const rawTitle = page?.seo?.title || seoSettings.defaultTitle
  const fullTitle = rawTitle ? seoSettings.titleTemplate.replace('%s', rawTitle) : seoSettings.titleTemplate
  document.title = fullTitle

  const description = page?.seo?.description || seoSettings.defaultDescription
  setMetaTag('name', 'description', description)

  const ogImageRaw = page?.seo?.ogImage || seoSettings.defaultOgImage
  setMetaTag('property', 'og:title', fullTitle)
  setMetaTag('property', 'og:description', description)
  setMetaTag('property', 'og:site_name', seoSettings.siteName)
  setMetaTag('property', 'og:image', ogImageRaw ? resolveImageUrl(ogImageRaw) : '')

  setMetaTag('name', 'robots', page?.seo?.noindex ? 'noindex,follow' : '')
  setMetaTag('name', 'google-site-verification', seoSettings.googleSiteVerification)
}
