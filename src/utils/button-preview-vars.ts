import type { ButtonEntry } from '@/utils/button-style-entry'
import { resolveSwatchValue } from '@/utils/palette-entry'

// Turns one edited button entry into the CSS custom properties a live
// preview reads. Lives here rather than inside ButtonPaletteView because the
// tabs preview needs exactly the same translation for four different
// elements at once (the strip and its tabs).
//
// The point of driving a preview with variables instead of inline styles is
// that a genuinely interactive :hover needs real CSS - an inline style
// cannot express a pseudo-class at all. The fallback chain lives in the
// preview's own stylesheet (--btn-hover-bg falls back to --btn-bg when
// hover sets nothing of its own), which is the same "an unset state
// inherits from normal" cascade ButtonStylePicker applies for display, done
// by the real cascade rather than in JS.
//
// Only variables that are actually SET get written, so anything left
// undefined falls through that chain instead of overriding it with a
// meaningless empty value.
export function buttonPreviewVars (entry?: ButtonEntry): Record<string, string> {
  const vars: Record<string, string> = {}
  if (!entry) {
    return vars
  }
  const setColor = (name: string, key?: string) => {
    if (key) {
      vars[name] = resolveSwatchValue(key)
    }
  }
  const setBorder = (name: string, border?: ButtonEntry['base']['border']) => {
    if (border) {
      vars[name] = `${border.style} ${border.width}px ${border.color ? resolveSwatchValue(border.color) : 'transparent'}`
    }
  }
  const setPlain = (name: string, value?: string) => {
    if (value) {
      vars[name] = value
    }
  }
  for (const [state, prefix] of [['base', ''], ['hover', 'hover-'], ['disabled', 'disabled-']] as const) {
    const style = entry[state]
    setColor(`--btn-${prefix}bg`, style.background)
    setColor(`--btn-${prefix}color`, style.color)
    setBorder(`--btn-${prefix}border`, style.border)
    setPlain(`--btn-${prefix}radius`, style.borderRadius)
    setPlain(`--btn-${prefix}shadow`, style.boxShadow)
    // primary-button/green-button's entire :disabled styling IS this one
    // property (opacity:0.3, nothing else) - without it, switching a
    // preview to "disabled" visibly did nothing for them.
    if (style.opacity !== undefined) {
      vars[`--btn-${prefix}opacity`] = String(style.opacity / 100)
    }
  }
  return vars
}
