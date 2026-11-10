import { dbRequest } from '@/db/client'
import { report } from './report'

const IMPORT_PATTERN = /@import\s+['"](.+?)['"];?/g

// Style files have no folder structure at all - they're addressed purely by
// name (see src/db/config.ts), with a "vuetify-" prefix distinguishing the
// vuetify-component stylesheets from everything else (both groups live
// flat, side by side). vuetify-components.css still literally contains
// `@import './buttons.css';` etc. (real authored CSS content, untouched) -
// resolving that relative import to the right DB key just means: if the
// importing file is in the vuetify group, so is whatever it imports.
function resolveRelativeStyleName (baseName: string, relative: string): string {
  const cleaned = relative.replace(/^\.\//, '')
  if (!baseName.startsWith('vuetify-')) {
    return cleaned
  }
  return cleaned.startsWith('vuetify-') ? cleaned : `vuetify-${cleaned}`
}

/**
 * Loads a CSS file's text and inlines its `@import` statements (one level
 * deep, which is all vuetify-components.css currently uses) - a dynamically
 * injected <style> tag has no "sheet location" of its own, so relative
 * @import URLs inside it would otherwise resolve against the page's own
 * location instead of the stylesheet's directory and 404.
 */
async function fetchAndInlineImports (name: string): Promise<string> {
  const text = await dbRequest<string>('styles', 'get', { name })
  const matches = [...text.matchAll(IMPORT_PATTERN)]
  let result = text
  for (const match of matches) {
    const importName = resolveRelativeStyleName(name, match[1] as string)
    const importedText = await dbRequest<string>('styles', 'get', { name: importName })
    result = result.replace(match[0], importedText)
  }
  return result
}

/**
 * The edited app's own Vuetify-component styles (buttons, dialogs, text
 * fields etc. - all the "vuetify-*" style records) are meant to style the
 * *previewed app content*, not the editor's own Vuetify UI (which uses the
 * same component classes for its own toolbars/dialogs). Loading them as a
 * normal global stylesheet made them fight the editor's own chrome
 * everywhere, including inside teleported v-dialogs/v-menus.
 *
 * Wrapping the fetched CSS in `@scope (.scopeClass)` confines every rule to
 * actual DOM descendants of that class - which naturally excludes anything
 * teleported to <body> (editor dialogs, menus), without needing to touch a
 * single selector in the source file.
 */
// scopeClass AND layer are both optional - the standalone page-preview
// build (packages/page-preview) has no editor CSS/layer system to coexist
// with at all (production itself never uses @scope or @layer - both were
// invented purely to keep the editor's own chrome from fighting previewed
// content, a problem that build doesn't have), so it calls this with
// neither and gets the exact same CSS production itself loads: a plain,
// ordinary, unlayered stylesheet.
export async function loadScopedVuetifyStyles (activeTheme: number, fileName: string, scopeClass?: string, layer?: string): Promise<void> {
  const elementId = `theme-style--scoped--${fileName}`
  // getElementById (not querySelector('#'+id)) - a name could in principle
  // contain characters that aren't valid in a bare CSS id selector, which
  // would throw and take the whole main() bootstrap down with it.
  // eslint-disable-next-line unicorn/prefer-query-selector
  const existing = document.getElementById(elementId)
  if (existing) {
    existing.remove()
  }

  const name = `${fileName}.css`

  let cssText: string
  try {
    cssText = await fetchAndInlineImports(name)
  } catch (error) {
    report('error', 'styles', `Failed to load theme ${activeTheme} scoped style: ${fileName}`, error)
    return
  }

  // The layer (order locked in by index.html), when given: above Vuetify's
  // own component defaults, below its utility classes - so e.g. a
  // production button.css color override still applies, but an editor- or
  // content-author-added `mb-4` utility still wins over it when both target
  // the same element. With no layer at all, this is just plain CSS - the
  // exact same cascade relationship production gets "for free" from
  // ordinary stylesheet load order, no artificial layering needed.
  const style = document.createElement('style')
  style.id = elementId
  if (!layer) {
    style.textContent = cssText
  } else if (scopeClass) {
    style.textContent = `@layer ${layer} {\n@scope (.${scopeClass}) {\n${cssText}\n}\n}`
  } else {
    style.textContent = `@layer ${layer} {\n${cssText}\n}`
  }
  document.head.append(style)
}
