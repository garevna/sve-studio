import { dbRequest } from '@/db/client'
import { report } from './report'

// layer is optional - the standalone page-preview build (packages/page-preview)
// has no editor CSS layer system to coexist with at all (production itself
// never uses @layer), so it calls this with no layer name and gets the same
// CSS as a plain, ordinary stylesheet, exactly as production loads it.
export async function loadThemeStyles (activeTheme: number, styleNames: string[], layer?: string): Promise<void> {
  await Promise.all(styleNames.map(async fileName => {
    const elementId = `theme-style--${fileName}`
    // getElementById, not querySelector('#'+id) - a name with characters
    // invalid in a bare CSS id selector would otherwise throw here and take
    // the whole main() bootstrap down with it.
    // eslint-disable-next-line unicorn/prefer-query-selector
    const existing = document.getElementById(elementId)
    if (existing) {
      existing.remove()
    }

    let cssText: string
    try {
      cssText = await dbRequest<string>('styles', 'get', { name: `${fileName}.css` })
    } catch (error) {
      report('error', 'styles', `Failed to load theme ${activeTheme} style: ${fileName}`, error)
      return
    }

    // Fetched (not a plain <link>) and wrapped in the given layer (order
    // locked in by index.html) so it loses to Vuetify's own utility classes
    // when both apply to the same element - a <link layer="..."> was tried
    // first but didn't actually get picked up as layered by Chrome, so this
    // does the wrapping directly in the CSS text instead.
    const style = document.createElement('style')
    style.id = elementId
    style.textContent = layer ? `@layer ${layer} {\n${cssText}\n}` : cssText
    document.head.append(style)
  }))
}
