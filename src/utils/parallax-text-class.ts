// The look of a text in the top parallax's panel (header / title / text).
// A text formatted in the editor (size, weight, font - TextFormatMenu) is
// drawn with that format; one that never was keeps the panel's own look -
// so a parallax saved before this existed renders unchanged. Spacing
// classes (mt-16, my-8...) left over from the block's template are never
// applied: the panel lays its texts out itself.
// Nor is a colour: the panel is a dark veil over the picture and its texts
// are white (parallax.css) - a format's default text-black would turn them
// black on it.
// The same file lives in the site (site/src/utils/parallax-text-class.ts).

const SPACING = /^[mp][trblxyse]?-/
const FORMAT = /^(h[1-6]|default-text|small-text|text-(thin|medium|bold)|accent-font(-\d+)?)$/

const ALIGN = /^text-(left|center|right|justify)$/

export function parallaxTextClass (stored: string | undefined, fallback: string): string {
  const tokens = (stored || '').split(/\s+/).filter(token => token && !SPACING.test(token))
  if (!tokens.some(token => FORMAT.test(token))) {
    return fallback
  }
  return tokens.filter(token => FORMAT.test(token) || ALIGN.test(token)).join(' ')
}

export const PARALLAX_TEXT_DEFAULTS = {
  header: 'parallax-header',
  title: 'parallax-title text-bold text-left',
  text: 'parallax-text text-left',
} as const
