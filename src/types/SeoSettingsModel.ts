// Site-wide SEO defaults - a settings singleton (seo.json), same shape/role
// as GlobalSettingsModel/palette.json. Per-page overrides live directly on
// TemplatePageModel.seo instead (see TemplateBlockModel.ts) - there's no
// separate per-page list here, since editing a page's SEO fields away from
// its own content would just mean cross-referencing two places for one edit.
export interface SeoSettingsModel {
  // "%s" is replaced with the page's own title (or defaultTitle, if a page
  // has none) - e.g. "%s — Virtual Dimension". A page with no "%s" in sight just
  // shows this template verbatim, which is a reasonable fallback rather
  // than an error case worth guarding against.
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
