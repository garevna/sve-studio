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
  raw: CssDeclaration[]
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

export function extractCardStyles (cssText: string): { entries: CardStyleEntry[], otherNodes: CssNode[] } {
  const entries: CardStyleEntry[] = []
  const otherNodes: CssNode[] = []
  for (const node of parseCss(cssText)) {
    const className = node.kind === 'rule' && node.selectors.length === 1 ? node.selectors[0]?.match(SIMPLE_CLASS_RE)?.[1] : undefined
    if (node.kind !== 'rule' || !className || entries.some(entry => entry.className === className)) {
      otherNodes.push(node)
      continue
    }
    const entry: CardStyleEntry = { className, label: className, background: '', border: '', radius: '', shadow: '', raw: [] }
    for (const declaration of node.declarations) {
      const { property, value } = declaration
      if (property === LABEL_PROPERTY) {
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
  return { entries, otherNodes }
}

export function cardStyleDeclarations (entry: CardStyleEntry): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  const add = (property: string, value: string) => declarations.push({ property, value, important: false })
  add(LABEL_PROPERTY, JSON.stringify(entry.label))
  if (entry.background) {
    add('background', entry.background === 'transparent' ? 'transparent' : `var(--${entry.background})`)
  }
  if (entry.border) {
    add('border', entry.border === 'none' ? 'none' : `var(--${entry.border})`)
  }
  if (entry.radius) {
    add('border-radius', entry.radius === '0' ? '0' : `var(--${entry.radius})`)
  }
  if (entry.shadow) {
    add('box-shadow', CARD_SHADOWS[entry.shadow] ?? entry.shadow)
  }
  declarations.push(...entry.raw)
  return declarations
}

/** The style as inline CSS, for the UI Kit's own live preview. */
export function cardStyleInline (entry: CardStyleEntry): Record<string, string> {
  const style: Record<string, string> = {}
  for (const { property, value } of cardStyleDeclarations(entry)) {
    if (!property.startsWith('--')) {
      style[property] = value
    }
  }
  return style
}

export function serializeCardStyles (entries: CardStyleEntry[], otherNodes: CssNode[]): string {
  const nodes: CssNode[] = entries.map(entry => ({ kind: 'rule', selectors: [`.${entry.className}`], declarations: cardStyleDeclarations(entry) }))
  return `${FILE_HEADER}\n${serializeCss([...nodes, ...otherNodes])}\n`
}
