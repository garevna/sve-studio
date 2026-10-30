// The page preview used to live at /preview/?pageId=...&locale=...; it is
// the site now (/site/...). Old links and open tabs land on the same page.
export default defineEventHandler(event => {
  const query = getQuery(event)
  const pageId = typeof query.pageId === 'string' && query.pageId !== 'home-page' ? query.pageId : ''
  const locale = typeof query.locale === 'string' ? query.locale : ''
  const path = [locale, pageId].filter(Boolean).join('/')
  return sendRedirect(event, `/site/${path}`, 301)
})
