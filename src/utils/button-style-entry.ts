import type { CssDeclaration, CssNode, CssRule } from './css-rules'
import { parseCss, serializeCss } from './css-rules'
import { BORDER_STYLES, resolveSwatchValue } from './palette-entry'

export type ButtonState = 'base' | 'hover' | 'disabled'
export const BUTTON_STATES: ButtonState[] = ['base', 'hover', 'disabled']

export interface ButtonBorder {
  style: string
  width: number
  color: string
}

export interface ButtonStateStyle {
  background?: string
  color?: string
  border?: ButtonBorder
  borderRadius?: string
  boxShadow?: string
  // 0-100 (percent, for the UI slider) - parsed from both CSS forms this
  // stylesheet actually uses ("0.3" and "92%"). Promoted out of `raw` to a
  // typed field: it's the ENTIRE disabled-state styling for primary-button/
  // green-button (opacity:0.3, nothing else), so leaving it inert in raw
  // meant checking "disabled" in the live preview visibly did nothing for
  // those two classes even though production genuinely dims them.
  opacity?: number
  // Everything on this selector this editor doesn't structurally understand
  // (font-weight, width:100%, display:grid...) - shown read-only, carried
  // through untouched on save so nothing is silently dropped.
  raw: CssDeclaration[]
}

export interface ButtonEntry {
  className: string
  base: ButtonStateStyle
  hover: ButtonStateStyle
  disabled: ButtonStateStyle
}

function emptyState (): ButtonStateStyle {
  return { raw: [] }
}

function emptyEntry (className: string): ButtonEntry {
  return { className, base: emptyState(), hover: emptyState(), disabled: emptyState() }
}

// A bare CSS var() reference stores just the palette key (matching
// PaletteSwatchPicker.vue's own convention - callers wrap with var(--key)
// themselves) - anything else (a literal hex, "transparent", ...) passes
// through as-is, so a value this editor doesn't recognize as a palette
// reference is still preserved and shown, just not swatch-matched.
const VAR_KEY_RE = /^var\(--([\w-]+)\)$/

function parseColorValue (value: string): string {
  const match = value.trim().match(VAR_KEY_RE)
  return match ? (match[1] as string) : value.trim()
}

// Palette-key -> CSS value resolution (var(--key), or the literal value
// unwrapped for something like "transparent") is shared with
// PaletteSwatchPicker.vue/ButtonStylePicker.vue's own preview rendering -
// see resolveSwatchValue in palette-entry.ts.
const serializeColorValue = resolveSwatchValue

const BORDER_WIDTH_RE = /(\d+(?:\.\d+)?)px/
const BORDER_STYLE_RE = new RegExp(String.raw`\b(${BORDER_STYLES.join('|')})\b`, 'i')

function parseBorderValue (value: string): ButtonBorder | undefined {
  const widthMatch = value.match(BORDER_WIDTH_RE)
  const styleMatch = value.match(BORDER_STYLE_RE)
  if (!widthMatch || !styleMatch) {
    return undefined
  }
  const color = value
    .replace(widthMatch[0], '')
    .replace(styleMatch[0], '')
    .trim()
  return { style: styleMatch[1] as string, width: Number(widthMatch[1]), color: parseColorValue(color) }
}

function serializeBorderValue (border: ButtonBorder): string {
  return `${border.style} ${border.width}px ${serializeColorValue(border.color)}`
}

function parseOpacityValue (value: string): number | undefined {
  const trimmed = value.trim()
  const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)%$/)
  if (percentMatch) {
    return Number(percentMatch[1])
  }
  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (fractionMatch) {
    return Math.round(Number(fractionMatch[1]) * 100)
  }
  return undefined
}

// Always the decimal form ("0.3"), regardless of which form the original
// value used - CSS accepts both interchangeably, one canonical output form
// is simpler than trying to preserve which one a given rule happened to use.
function serializeOpacityValue (percent: number): string {
  return String(Math.round(percent) / 100)
}

// Only a single class, no combinator/tag/compound - .foo, .foo:hover,
// .foo:disabled. Rejects the bare `button` tag, descendant selectors
// (.v-tab-item--selected .v-tab--selected), and compound ones
// (.v-btn.primary-button) - those stay in otherNodes untouched rather than
// being guessed at. Also rejects Vuetify's own internal "v-*" classes
// (.v-btn--primary etc) - real button classes, not noise the palette
// should surface as its own editable entries.
const SIMPLE_SELECTOR_RE = /^\.([a-zA-Z_-][\w-]*)(:hover|:disabled)?$/

function stateForSelector (selector: string): { className: string, state: ButtonState } | undefined {
  const match = selector.match(SIMPLE_SELECTOR_RE)
  if (!match) {
    return undefined
  }
  const className = match[1] as string
  if (className.startsWith('v-')) {
    return undefined
  }
  const state: ButtonState = match[2] === ':hover' ? 'hover' : (match[2] === ':disabled' ? 'disabled' : 'base')
  return { className, state }
}

function applyDeclaration (target: ButtonStateStyle, declaration: CssDeclaration) {
  const { property, value } = declaration
  switch (property) {
    case 'background': {
      target.background = parseColorValue(value)
      break
    }
    case 'color': {
      target.color = parseColorValue(value)
      break
    }
    case 'border': {
      target.border = parseBorderValue(value) ?? target.border
      break
    }
    case 'border-radius': {
      target.borderRadius = value
      break
    }
    case 'box-shadow': {
      target.boxShadow = value
      break
    }
    case 'opacity': {
      target.opacity = parseOpacityValue(value) ?? target.opacity
      break
    }
    default: {
      // Last-wins, matching real CSS cascade order - a property set by more
      // than one qualifying rule for this class+state (e.g. .button-with-
      // icon-right's own "width" appears in two separate rules) would
      // otherwise show up twice in the read-only raw list and get emitted
      // twice on save.
      const existingIndex = target.raw.findIndex(item => item.property === property)
      if (existingIndex === -1) {
        target.raw.push(declaration)
      } else {
        target.raw[existingIndex] = declaration
      }
    }
  }
}

export function extractButtonEntries (cssText: string): { entries: ButtonEntry[], otherNodes: CssNode[] } {
  const nodes = parseCss(cssText)
  const byClassName = new Map<string, ButtonEntry>()
  const otherNodes: CssNode[] = []

  for (const node of nodes) {
    if (node.kind !== 'rule') {
      otherNodes.push(node)
      continue
    }

    // Per-selector, not all-or-nothing: a shared rule like
    // `button, .simple-button, .primary-button, ... { border-radius: ...; }`
    // genuinely styles EVERY one of those classes (this is what makes an
    // extracted entry actually complete instead of missing real production
    // values) - only the selectors that don't resolve to a real class
    // (the bare `button` tag, compound/descendant selectors, Vuetify's own
    // internals) stay behind as a residual rule with the same declarations,
    // so nothing is lost for whatever still needs them.
    const unmatchedSelectors: string[] = []
    for (const selector of node.selectors) {
      const match = stateForSelector(selector)
      if (!match) {
        unmatchedSelectors.push(selector)
        continue
      }
      const entry = byClassName.get(match.className) ?? emptyEntry(match.className)
      byClassName.set(match.className, entry)
      const target = match.state === 'hover' ? entry.hover : (match.state === 'disabled' ? entry.disabled : entry.base)
      for (const declaration of node.declarations) {
        applyDeclaration(target, declaration)
      }
    }
    if (unmatchedSelectors.length > 0) {
      otherNodes.push({ kind: 'rule', selectors: unmatchedSelectors, declarations: node.declarations })
    }
  }

  return { entries: [...byClassName.values()], otherNodes }
}

function stateDeclarations (style: ButtonStateStyle): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  if (style.background) {
    declarations.push({ property: 'background', value: serializeColorValue(style.background), important: true })
  }
  if (style.color) {
    declarations.push({ property: 'color', value: serializeColorValue(style.color), important: true })
  }
  if (style.border) {
    declarations.push({ property: 'border', value: serializeBorderValue(style.border), important: true })
  }
  if (style.borderRadius) {
    declarations.push({ property: 'border-radius', value: style.borderRadius, important: true })
  }
  if (style.boxShadow) {
    declarations.push({ property: 'box-shadow', value: style.boxShadow, important: true })
  }
  if (style.opacity !== undefined) {
    declarations.push({ property: 'opacity', value: serializeOpacityValue(style.opacity), important: true })
  }
  declarations.push(...style.raw)
  return declarations
}

const STATE_SUFFIX: Record<ButtonState, string> = { base: '', hover: ':hover', disabled: ':disabled' }

export function serializeButtonEntries (entries: ButtonEntry[], otherNodes: CssNode[]): string {
  const nodes: CssNode[] = []
  for (const entry of entries) {
    for (const state of BUTTON_STATES) {
      const style = state === 'hover' ? entry.hover : (state === 'disabled' ? entry.disabled : entry.base)
      const declarations = stateDeclarations(style)
      if (declarations.length === 0) {
        continue
      }
      const rule: CssRule = { kind: 'rule', selectors: [`.${entry.className}${STATE_SUFFIX[state]}`], declarations }
      nodes.push(rule)
    }
  }
  nodes.push(...otherNodes)
  return serializeCss(nodes)
}
