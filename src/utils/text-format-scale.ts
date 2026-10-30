// The full font-size scale from typographics.css, ascending: body text
// (extra-small-text 12px < small-text 14px < default-text 16px) continues
// straight into the heading utility classes (h6 18px < h5 20px < h4 22px <
// h3 28px < h2 36px < h1 96px) - all usable as plain classes on any element,
// not just literal <h1>-<h6> tags. Shared by TextEditor.vue (which owns the
// actual class mutation) and TextFormatMenu.vue (which only needs it to
// compute disabled state) so the two can't drift out of sync again.
export const SIZE_SCALE = ['extra-small-text', 'small-text', 'default-text', 'h6', 'h5', 'h4', 'h3', 'h2', 'h1']

// The actual pixel size each SIZE_SCALE class resolves to (see
// typographics.css) - shown as the button label in TextFormatMenu.vue's
// size picker so the user picks a size directly by its real px value,
// rather than stepping through the scale one notch at a time.
export const SIZE_PIXELS: Record<string, number> = {
  'extra-small-text': 12,
  'small-text': 14,
  'default-text': 16,
  'h6': 18,
  'h5': 20,
  'h4': 22,
  'h3': 28,
  'h2': 36,
  'h1': 96,
}

export const WEIGHT_SCALE = ['text-thin', 'text-medium', 'text-bold']

// Text color is also a plain class - `text-{paletteKey}` (text-primary,
// text-special, text-dark-grey...), same convention as the app's own real
// content (see contacts-page.json). To find/replace "the color class" among
// everything else riding in the same class string, exclude the other known
// `text-*` classes (weight, alignment) - anything else matching `text-*` is
// treated as a color class.
export const NON_COLOR_TEXT_CLASSES = new Set([...WEIGHT_SCALE, 'text-left', 'text-center', 'text-right'])
