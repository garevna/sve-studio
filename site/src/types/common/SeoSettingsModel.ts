// Site-wide SEO defaults - a settings singleton (seo.json), same shape/role
// as GlobalSettingsModel/palette.json. Per-page overrides live directly on
// TemplatePageModel.seo instead (see TemplateBlockModel.ts).
export interface SeoSettingsModel {
  // "%s" is replaced with the page's own title (or defaultTitle, if a page
  // has none) - e.g. "%s — Virtual Dimension". A page with no "%s" in sight just
  // shows this template verbatim.
  titleTemplate: string
  defaultTitle: string
  defaultDescription: string
  defaultOgImage: string
  siteName: string
  // Search Console ownership verification - the content of
  // <meta name="google-site-verification" content="...">. Empty string
  // means the tag isn't rendered at all.
  googleSiteVerification: string
}

// Per-page overrides of the site-wide defaults above - everything optional,
// a page with no seo object at all just uses the defaults untouched.
export interface PageSeoModel {
  title?: string
  description?: string
  ogImage?: string
  // Renders <meta name="robots" content="noindex,follow"> - for pages that
  // shouldn't show up in search results without blocking crawlers from
  // still following their links.
  noindex?: boolean
}
