import type { CssDeclaration, CssNode } from './css-rules'
import { parseCss, serializeCss } from './css-rules'

// One card style of the UI Kit - a class in content/styles/cards.css.
// Every value is a palette reference, never a literal colour: background a
// colour key, border a palette border ("light-border" -> var(--light-border)),
// radius a palette radius. Shadow is one of a few presets.
export interface CardStyleEntry {
  className: string
  label: string
  background: string
  border: string // palette border key, 'none', or '' (not set)
  radius: string // palette radius key, '0', or '' (not set)
  shadow: string // CARD_SHADOWS key, or a literal value read from the file
  // «Штрих»: instead of a frame, two opposite corners drawn in a line that
  // fades out along the edges - full colour at the corner, gone halfway.
  stroke: CardStroke | null
  // «Хвиля»: on hover a wave of colour rises from the bottom and fills the
  // card - the motion of the «Хвиля» button (configs/button-catalog.ts).
  wave: CardWave | null
  // «Неон»: a pane of dark glass with a glowing outline - the light inside
  // and around it in the glow's colour, brighter on hover. Its text white.
  glow: CardGlow | null
  // The colours of what is on the card (palette keys, '' - not set): the
  // icon, the disc behind it, the title, the text. A block's own colours
  // (its toolbar, its card template) win over the icon's two; the title's
  // and text's win over the block's text format.
  colors: CardColors
  raw: CssDeclaration[]
}

export type CardColors = { icon: string, disc: string, title: string, text: string }
export const NO_CARD_COLORS: CardColors = { icon: '', disc: '', title: '', text: '' }

// Kept as custom properties on the card: the icon's two are read by the
// card itself (TemplateCard.vue - var(--card-icon-color, ...)); the title's
// and text's by two rules of their own. `:not(#_)` lifts those over the
// colour classes of the text format and the «Неон» style's white.
const COLOR_PROPS: Record<keyof CardColors, string> = {
  icon: '--card-icon-color',
  disc: '--card-icon-disc',
  title: '--card-title-color',
  text: '--card-text-color',
}

function colorNodes (className: string, colors: CardColors): CssNode[] {
  const c = `.${className}`
  const rule = (selector: string, property: string): CssNode => ({ kind: 'rule', selectors: [selector], declarations: [{ property: 'color', value: `var(${property})`, important: true }] })
  return [
    ...(colors.title ? [rule(`${c} h4:not(#_)`, COLOR_PROPS.title)] : []),
    ...(colors.text ? [rule(`${c} .card-content-text:not(#_)`, COLOR_PROPS.text)] : []),
  ]
}

function isColorNode (node: CssNode, className: string): boolean {
  const c = `.${className}`
  return node.kind === 'rule' && node.selectors.every(selector => selector === `${c} h4:not(#_)` || selector === `${c} .card-content-text:not(#_)`)
}

export interface CardGlow {
  // palette colour key, or 'site': the site's glow (the «Стиль сайту»
  // menu, --neon-glow), gold when it has none
  color: string
}

function glowVar (color: string): string {
  return color === 'site' ? 'var(--neon-glow, var(--warning))' : `var(--${color})`
}

// The glow's colour is kept as a marker property; every declaration names
// the colour itself (the UI Kit's sample is inline style, which has no
// custom properties to read).
const GLOW_COLOR = '--card-glow-color'
const GLOW_OWN = ['background', 'border', 'box-shadow', 'backdrop-filter', 'color', 'transition']

function glowShadow (color: string, strength: number): string {
  const c = (share: number) => `color-mix(in srgb, ${glowVar(color)} ${Math.min(100, Math.round(share * strength))}%, transparent)`
  return `0 0 4px ${c(70)}, 0 0 18px ${c(35)}, inset 0 0 18px ${c(18)}`
}

function glowDeclarations (glow: CardGlow): [string, string][] {
  return [
    [GLOW_COLOR, glow.color],
    // dark glass, a little light caught at its top-left
    ['background', 'linear-gradient(160deg, color-mix(in srgb, var(--white) 12%, transparent), transparent 45%), color-mix(in srgb, var(--neon-night, var(--black)) 62%, transparent)'],
    ['backdrop-filter', 'blur(10px)'],
    ['border', `1px solid color-mix(in srgb, ${glowVar(glow.color)} 75%, transparent)`],
    ['box-shadow', glowShadow(glow.color, 1)],
    ['color', 'var(--white)'],
    ['transition', 'box-shadow 0.35s ease'],
  ]
}

// Brighter on hover; the card's texts white on the glass, whatever colour
// their own classes give them.
function glowNodes (className: string, glow: CardGlow): CssNode[] {
  const c = `.${className}`
  return [
    { kind: 'rule', selectors: [`${c}:hover`, `${c}:focus-within`], declarations: [
      { property: 'box-shadow', value: glowShadow(glow.color, 1.6), important: false },
    ] },
    // the texts, not the icons: an icon keeps its own colour (a card
    // template's or the block's)
    { kind: 'rule', selectors: [`${c} *:not(.v-icon):not(.mdi):not(i):not(svg):not(svg *)`], declarations: [
      { property: 'color', value: 'var(--white)', important: true },
    ] },
  ]
}

function isGlowNode (node: CssNode, className: string): boolean {
  const c = `.${className}`
  return node.kind === 'rule' && node.selectors.every(selector => selector.startsWith(`${c}:hover`) || selector.startsWith(`${c}:focus-within`) || selector.startsWith(`${c} *`))
}

export interface CardWave {
  color: string // palette colour key - a light one keeps the text readable
  // the edge of the card's outline that bends into a wave under the
  // pointer (utils/wave-edge.ts); 'none': the outline stays as it is
  edge: CardWaveEdge
}

export const CARD_WAVE_EDGES = ['bottom', 'top', 'left', 'right', 'none'] as const
export type CardWaveEdge = typeof CARD_WAVE_EDGES[number]

// The wave is the card's ::before, behind its content; its colour is kept
// as a custom property, the rules for it are written from it.
const WAVE_COLOR = '--card-wave-color'
const WAVE_EDGE = '--wave-edge'
const WAVE_OWN = ['position', 'overflow', 'isolation', WAVE_EDGE]

function waveNodes (className: string): CssNode[] {
  const c = `.${className}`
  return [
    { kind: 'rule', selectors: [`${c}::before`], declarations: [
      ['content', '""'],
      ['position', 'absolute'],
      ['left', '50%'],
      ['top', '105%'],
      ['z-index', '-1'],
      ['width', '220%'],
      ['aspect-ratio', '1'],
      ['border-radius', '42%'],
      ['background', `var(${WAVE_COLOR})`],
      ['transform', 'translateX(-50%) rotate(0deg)'],
      ['transition', 'top 0.9s ease, transform 1.4s ease'],
      ['pointer-events', 'none'],
    ].map(([property, value]) => ({ property: property as string, value: value as string, important: false })) },
    { kind: 'rule', selectors: [`${c}:hover::before`, `${c}:focus-within::before`], declarations: [
      { property: 'top', value: '-60%', important: false },
      { property: 'transform', value: 'translateX(-50%) rotate(180deg)', important: false },
    ] },
    { kind: 'raw', text: `@media (prefers-reduced-motion: reduce) {\n  ${c}::before {\n    transition: none;\n  }\n}` },
  ]
}

// The wave's own rules, as read back from the file - written anew from
// the entry, so not kept as they were.
function isWaveNode (node: CssNode, className: string): boolean {
  const c = `.${className}`
  if (node.kind === 'rule') {
    return node.selectors.every(selector => selector.startsWith(`${c}::before`) || selector.startsWith(`${c}:hover::before`) || selector.startsWith(`${c}:focus-within::before`))
  }
  return node.text.includes('prefers-reduced-motion') && node.text.includes(`${c}::before`)
}

export type StrokeCorners = 'tl-br' | 'tr-bl'

export interface CardStroke {
  color: string // palette colour key
  width: number // px
  corners: StrokeCorners
}

export const STROKE_WIDTHS = [1, 2, 3, 4, 6]

// The line is the card's border, painted with a corner-to-corner gradient
// (border-box), the card's fill laid over it (padding-box) - so it follows
// rounded corners and needs no extra element. Its settings are kept as
// custom properties; background and border are written from them.
const STROKE_COLOR = '--card-stroke-color'
const STROKE_WIDTH = '--card-stroke-width'
const STROKE_CORNERS = '--card-stroke-corners'
const STROKE_FILL = '--card-stroke-fill'

// A palette key holding a gradient is an image already; a colour is made
// one, as a layer under a gradient must be. No fill: white, or the line's
// gradient would show through the whole card.
function fillLayer (key: string): string {
  if (!key || key === 'transparent') {
    return 'linear-gradient(var(--white), var(--white))'
  }
  return key.includes('gradient') ? `var(--${key})` : `linear-gradient(var(--${key}), var(--${key}))`
}

function strokeDeclarations (stroke: CardStroke, background: string): [string, string][] {
  const direction = stroke.corners === 'tl-br' ? 'to bottom right' : 'to bottom left'
  return [
    [STROKE_COLOR, stroke.color],
    [STROKE_WIDTH, String(stroke.width)],
    [STROKE_CORNERS, stroke.corners],
    [STROKE_FILL, background || 'none'],
    ['border', `${stroke.width}px solid transparent`],
    ['background', `${fillLayer(background)} padding-box, linear-gradient(${direction}, var(--${stroke.color}), transparent 50%, var(--${stroke.color})) border-box`],
  ]
}

export const CARD_SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 2px 8px #0000001a',
  medium: '0 0 12px #00000020',
  strong: '0 8px 24px #00000033',
}

const LABEL_PROPERTY = '--card-style-label'
const VAR_RE = /^var\(--([\w-]+)\)$/
const SIMPLE_CLASS_RE = /^\.([a-zA-Z][\w-]*)$/

const FILE_HEADER = `/* Card styles - the UI Kit's "Картки" tab edits this file. A cards block
   refers to one of these classes by name (block.cardStyle); a block that
   names none uses the style of its layout variant (configs/card-style.ts).
   Only the LOOK lives here - fill, border, corners, shadow.
   --card-style-label is the name shown in the editor. */`

function varKey (value: string): string | undefined {
  return value.trim().match(VAR_RE)?.[1]
}

function unquote (value: string): string {
  return value.trim().replace(/^["']|["']$/g, '')
}

// «Штрих» and «Хвиля» are kept as custom properties; read back from them.
function readEffects (entry: CardStyleEntry, declarations: CssDeclaration[]) {
  const declared = (property: string) => declarations.find(item => item.property === property)?.value.trim()
  for (const [key, property] of Object.entries(COLOR_PROPS) as [keyof CardColors, string][]) {
    const value = declared(property)
    if (value) {
      entry.colors[key] = varKey(value) ?? value
    }
  }
  const strokeColor = declared(STROKE_COLOR)
  if (strokeColor) {
    entry.stroke = {
      color: strokeColor,
      width: Number(declared(STROKE_WIDTH)) || 2,
      corners: declared(STROKE_CORNERS) === 'tr-bl' ? 'tr-bl' : 'tl-br',
    }
    const fill = declared(STROKE_FILL)
    entry.background = fill && fill !== 'none' ? fill : ''
  }
  const waveColor = declared(WAVE_COLOR)
  if (waveColor) {
    const edge = declared(WAVE_EDGE) as CardWaveEdge
    entry.wave = { color: varKey(waveColor) ?? waveColor, edge: CARD_WAVE_EDGES.includes(edge) ? edge : 'bottom' }
  }
  const glowColor = declared(GLOW_COLOR)
  if (glowColor) {
    entry.glow = { color: varKey(glowColor) ?? glowColor }
  }
}

export function extractCardStyles (cssText: string): { entries: CardStyleEntry[], otherNodes: CssNode[] } {
  const entries: CardStyleEntry[] = []
  const otherNodes: CssNode[] = []
  for (const node of parseCss(cssText)) {
    const className = node.kind === 'rule' && node.selectors.length === 1 ? node.selectors[0]?.match(SIMPLE_CLASS_RE)?.[1] : undefined
    if (node.kind !== 'rule' || !className || entries.some(entry => entry.className === className)) {
      otherNodes.push(node)
      continue
    }
    const entry: CardStyleEntry = { className, label: className, background: '', border: '', radius: '', shadow: '', stroke: null, wave: null, glow: null, colors: { ...NO_CARD_COLORS }, raw: [] }
    readEffects(entry, node.declarations)
    for (const declaration of node.declarations) {
      const { property, value } = declaration
      if (entry.stroke && [STROKE_COLOR, STROKE_WIDTH, STROKE_CORNERS, STROKE_FILL, 'background', 'border'].includes(property)) {
        // written from the stroke's settings (strokeDeclarations)
      } else if (Object.values(COLOR_PROPS).includes(property)) {
        // written from the entry's colours
      } else if (entry.glow && [GLOW_COLOR, ...GLOW_OWN].includes(property)) {
        // written from the glow's settings (glowDeclarations)
      } else if (entry.wave && [WAVE_COLOR, ...WAVE_OWN].includes(property)) {
        // written from the wave's settings (cardStyleDeclarations)
      } else if (property === LABEL_PROPERTY) {
        entry.label = unquote(value) || className
      } else if (property === 'background' && varKey(value)) {
        entry.background = varKey(value) as string
      } else if (property === 'border' && (varKey(value) || value.trim() === 'none')) {
        entry.border = varKey(value) ?? 'none'
      } else if (property === 'border-radius' && (varKey(value) || value.trim() === '0')) {
        entry.radius = varKey(value) ?? '0'
      } else if (property === 'box-shadow') {
        const preset = Object.keys(CARD_SHADOWS).find(key => CARD_SHADOWS[key] === value.trim())
        entry.shadow = preset ?? value.trim()
      } else {
        entry.raw.push(declaration)
      }
    }
    entries.push(entry)
  }
  const waved = entries.filter(entry => entry.wave).map(entry => entry.className)
  const glowing = entries.filter(entry => entry.glow).map(entry => entry.className)
  return {
    entries,
    otherNodes: otherNodes.filter(node => !waved.some(className => isWaveNode(node, className)) && !glowing.some(className => isGlowNode(node, className)) && !entries.some(entry => isColorNode(node, entry.className))),
  }
}

export function cardStyleDeclarations (entry: CardStyleEntry): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  const add = (property: string, value: string) => declarations.push({ property, value, important: false })
  add(LABEL_PROPERTY, JSON.stringify(entry.label))
  if (entry.glow) {
    for (const [property, value] of glowDeclarations(entry.glow)) {
      add(property, value)
    }
  } else if (entry.stroke) {
    for (const [property, value] of strokeDeclarations(entry.stroke, entry.background)) {
      add(property, value)
    }
  } else {
    if (entry.background) {
      add('background', entry.background === 'transparent' ? 'transparent' : `var(--${entry.background})`)
    }
    if (entry.border) {
      add('border', entry.border === 'none' ? 'none' : `var(--${entry.border})`)
    }
  }
  if (entry.radius) {
    add('border-radius', entry.radius === '0' ? '0' : `var(--${entry.radius})`)
  }
  if (entry.shadow && !entry.glow) {
    add('box-shadow', CARD_SHADOWS[entry.shadow] ?? entry.shadow)
  }
  if (entry.wave) {
    add(WAVE_COLOR, `var(--${entry.wave.color})`)
    add('position', 'relative')
    add('overflow', 'hidden')
    add('isolation', 'isolate')
    add(WAVE_EDGE, entry.wave.edge)
  }
  for (const [key, property] of Object.entries(COLOR_PROPS) as [keyof CardColors, string][]) {
    if (entry.colors?.[key]) {
      add(property, `var(--${entry.colors[key]})`)
    }
  }
  declarations.push(...entry.raw)
  return declarations
}

/** The style as inline CSS, for the UI Kit's own live preview. */
export function cardStyleInline (entry: CardStyleEntry): Record<string, string> {
  const style: Record<string, string> = {}
  for (const { property, value } of cardStyleDeclarations(entry)) {
    // the wave's edge too: utils/wave-edge.ts reads it off the sample
    if (!property.startsWith('--') || property === WAVE_EDGE || Object.values(COLOR_PROPS).includes(property)) {
      style[property] = value
    }
  }
  return style
}

export function serializeCardStyles (entries: CardStyleEntry[], otherNodes: CssNode[]): string {
  const nodes: CssNode[] = entries.flatMap(entry => [
    { kind: 'rule', selectors: [`.${entry.className}`], declarations: cardStyleDeclarations(entry) } as CssNode,
    ...(entry.wave ? waveNodes(entry.className) : []),
    ...(entry.glow ? glowNodes(entry.className, entry.glow) : []),
    ...colorNodes(entry.className, entry.colors ?? NO_CARD_COLORS),
  ])
  return `${FILE_HEADER}\n${serializeCss([...nodes, ...otherNodes])}\n`
}
