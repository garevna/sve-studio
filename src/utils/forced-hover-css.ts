import type { CssNode } from './css-rules'
import { parseCss, serializeCss } from './css-rules'

// A UI Kit sample shows the HOVER look of a button while that state is being
// edited - but a real :hover needs the mouse, and the mouse is on the
// fields. So every :hover rule is repeated under this class too, and the
// sample gets the class instead.
export const FORCE_HOVER_CLASS = 'ui-kit-force-hover'

export function forcedHoverRules (cssText: string): string {
  const rules: CssNode[] = []
  for (const node of parseCss(cssText)) {
    if (node.kind !== 'rule') {
      continue
    }
    const selectors = node.selectors.filter(selector => selector.includes(':hover'))
    if (selectors.length > 0) {
      rules.push({ ...node, selectors: selectors.map(selector => selector.replaceAll(':hover', `.${FORCE_HOVER_CLASS}`)) })
    }
  }
  return serializeCss(rules)
}

// The UI Kit's samples read the stylesheet being edited, not the one the
// editor loaded when it started: it is laid over that one, in a <style> of
// its own per file.
export function showLiveStyles (id: string, cssText: string) {
  let style = document.querySelector<HTMLStyleElement>(`#${id}`)
  if (!style) {
    style = document.createElement('style')
    style.id = id
    document.head.append(style)
  }
  style.textContent = `${cssText}\n\n${forcedHoverRules(cssText)}`
}
