export interface ColorPaletteEntry {
  kind: 'color'
  key: string
  color: string
}

// A named line - "solid 1px var(--primary)". `color` is a palette KEY
// ("primary"), so the line follows the palette: recolour primary and every
// border built on it changes with it. A literal hex is still read (older
// palettes stored "#D4DBF0 solid 1px") and kept until a swatch is picked.
export interface BorderPaletteEntry {
  kind: 'border'
  key: string
  borderStyle: string
  width: number
  color: string
}

export interface RawPaletteEntry {
  kind: 'raw'
  key: string
  value: string
}

// The 5 *-border-radius entries (default/small/extra-small/large/super) -
// see build-color-scheme.ts, which feeds these into Vuetify's theme
// `variables` so they resolve as --v-{key}, theme-scoped between the
// editor's own chrome (editorTheme) and the previewed app's real content
// (appTheme). Matched generically by key suffix + a plain "Npx" value,
// not a fixed list of the 5 known keys, so a future addition here doesn't
// also need a code change to be recognized.
export interface RadiusPaletteEntry {
  kind: 'radius'
  key: string
  value: number
}

// A named gradient, built from palette colours only: every stop is a
// palette KEY at a position (%), so recolouring a palette colour recolours
// every gradient using it. Stored as plain CSS -
// "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)" or
// "radial-gradient(circle, ...)" - so anything that takes `background:`
// can use it as var(--key).
export interface GradientStop {
  color: string
  at: number
}
export interface GradientPaletteEntry {
  kind: 'gradient'
  key: string
  type: 'linear' | 'radial'
  angle: number
  stops: GradientStop[]
}

export type PaletteEntry = ColorPaletteEntry | BorderPaletteEntry | RawPaletteEntry | RadiusPaletteEntry | GradientPaletteEntry

const GRADIENT_RE = /^(linear|radial)-gradient\((.*)\)$/i
const ANGLE_RE = /^(-?\d+(?:\.\d+)?)deg$/i
const STOP_RE = /^var\(--([\w-]+)\)\s+(\d+(?:\.\d+)?)%$/

// A gradient this editor can take apart - palette stops only; anything else
// stays a raw value.
export function parseGradient (key: string, value: string): GradientPaletteEntry | null {
  const match = value.match(GRADIENT_RE)
  if (!match) {
    return null
  }
  const type = match[1]!.toLowerCase() as 'linear' | 'radial'
  const parts = match[2]!.split(',').map(part => part.trim())
  let angle = 180
  if (type === 'linear' && ANGLE_RE.test(parts[0] ?? '')) {
    angle = Number(parts.shift()!.match(ANGLE_RE)![1])
  } else if (type === 'radial' && parts[0] === 'circle') {
    parts.shift()
  }
  const stops: GradientStop[] = []
  for (const part of parts) {
    const stop = part.match(STOP_RE)
    if (!stop) {
      return null
    }
    stops.push({ color: stop[1]!, at: Number(stop[2]) })
  }
  return stops.length >= 2 ? { kind: 'gradient', key, type, angle, stops } : null
}

export function gradientCss (entry: Pick<GradientPaletteEntry, 'type' | 'angle' | 'stops'>): string {
  const stops = entry.stops.toSorted((a, b) => a.at - b.at).map(stop => `var(--${stop.color}) ${stop.at}%`).join(', ')
  return entry.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${entry.angle}deg, ${stops})`
}

export function isGradientValue (value: unknown): boolean {
  return typeof value === 'string' && GRADIENT_RE.test(value.trim())
}

export const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset']

const HEX_COLOR_RE = /#[\da-f]{3,8}\b/i
const VAR_COLOR_RE = /var\(--([\w-]+)\)/
const WIDTH_RE = /(\d+(?:\.\d+)?)px/

const RADIUS_KEY_RE = /-border-radius$/
const PLAIN_PX_RE = /^(\d+(?:\.\d+)?)px$/

export function parsePaletteEntry (key: string, rawValue: unknown): PaletteEntry {
  const value = String(rawValue).trim()

  if (/^#[\da-f]{3,8}$/i.test(value)) {
    return { kind: 'color', key, color: value }
  }

  const gradient = parseGradient(key, value)
  if (gradient) {
    return gradient
  }

  if (RADIUS_KEY_RE.test(key)) {
    const pxMatch = value.match(PLAIN_PX_RE)
    if (pxMatch) {
      return { kind: 'radius', key, value: Number(pxMatch[1]) }
    }
  }

  const varMatch = value.match(VAR_COLOR_RE)
  const colorMatch = varMatch ?? value.match(HEX_COLOR_RE)
  const widthMatch = value.match(WIDTH_RE)
  const borderStyle = BORDER_STYLES.find(style => new RegExp(String.raw`\b${style}\b`, 'i').test(value))

  if (colorMatch && widthMatch && borderStyle) {
    const rest = value
      .replace(colorMatch[0], '')
      .replace(widthMatch[0], '')
      .replace(new RegExp(String.raw`\b${borderStyle}\b`, 'i'), '')
      .trim()

    if (rest === '') {
      const color = varMatch ? varMatch[1] as string : colorMatch[0]
      return { kind: 'border', key, borderStyle, width: Number(widthMatch[1]), color }
    }
  }

  return { kind: 'raw', key, value }
}

export function serializePaletteEntry (entry: PaletteEntry): string {
  if (entry.kind === 'color') {
    return entry.color
  }
  if (entry.kind === 'border') {
    return borderEntryCss(entry)
  }
  if (entry.kind === 'radius') {
    return `${entry.value}px`
  }
  if (entry.kind === 'gradient') {
    return gradientCss(entry)
  }
  return entry.value
}

// Values a color/border-color picker can hold besides a real palette key -
// "transparent" above all (PaletteSwatchPicker.vue's own dedicated swatch
// for it), plus whatever else this editor happens to read back untouched
// from existing CSS (a literal hex, rgb()/hsl(), inherit, currentcolor).
const LITERAL_COLOR_VALUE_RE = /^#|rgb|hsl|transparent|inherit|currentcolor/i

/** Whether a swatch-picker value is a literal CSS value rather than a palette key. */
export function isLiteralColorValue (value: string): boolean {
  return LITERAL_COLOR_VALUE_RE.test(value)
}

/**
 * Resolves a PaletteSwatchPicker.vue model value into a real CSS value - a
 * palette key becomes var(--key) (the convention every caller already
 * uses), a literal value (transparent, a hex color, ...) passes through
 * unwrapped, since wrapping e.g. "transparent" as var(--transparent) would
 * resolve to nothing.
 */
export function resolveSwatchValue (key: string): string {
  if (!key) {
    return ''
  }
  return isLiteralColorValue(key) ? key : `var(--${key})`
}

const VAR_REF_RE = /var\(--([\w-]+)\)/g

/** Which other palette keys a raw value references via var(--key), e.g. a gradient using var(--bright-grey). */
export function extractPaletteVarReferences (value: string, knownKeys: string[]): string[] {
  const referenced = new Set<string>()
  for (const match of value.matchAll(VAR_REF_RE)) {
    const key = match[1]
    if (key && knownKeys.includes(key)) {
      referenced.add(key)
    }
  }
  return [...referenced]
}

/** A border entry's CSS value - its colour as var(--key) when it is a palette key. */
export function borderEntryCss (entry: Pick<BorderPaletteEntry, 'borderStyle' | 'width' | 'color'>): string {
  return `${entry.borderStyle} ${entry.width}px ${resolveSwatchValue(entry.color)}`
}
