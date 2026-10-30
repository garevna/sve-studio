// Minimal hand-rolled CSS parser/serializer - no CSS parser is a project
// dependency (only @codemirror/lang-css, for syntax highlighting, not an
// AST). Deliberately not general-purpose: handles exactly the shape real
// theme stylesheets (buttons.css etc.) actually use - flat rules, the
// occasional @media block - and falls back to preserving anything more
// exotic verbatim rather than risking corrupting it.

export interface CssDeclaration {
  property: string
  value: string
  important: boolean
}

export interface CssRule {
  kind: 'rule'
  selectors: string[]
  declarations: CssDeclaration[]
}

// @media blocks, and anything else whose body itself contains nested
// braces - captured whole, never parsed further, re-emitted byte-for-byte.
export interface CssRaw {
  kind: 'raw'
  text: string
}

export type CssNode = CssRule | CssRaw

const IMPORTANT_RE = /!\s*important\s*$/i

function parseDeclarations (body: string): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  for (const part of body.split(';')) {
    const decl = part.trim()
    if (!decl) {
      continue
    }
    const colonIndex = decl.indexOf(':')
    if (colonIndex === -1) {
      continue
    }
    const property = decl.slice(0, colonIndex).trim()
    let value = decl.slice(colonIndex + 1).trim()
    const important = IMPORTANT_RE.test(value)
    if (important) {
      value = value.replace(IMPORTANT_RE, '').trim()
    }
    if (property && value) {
      declarations.push({ property, value, important })
    }
  }
  return declarations
}

export function parseCss (text: string): CssNode[] {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '')
  const nodes: CssNode[] = []
  const len = stripped.length
  let i = 0

  while (i < len) {
    while (i < len && /\s/.test(stripped[i] as string)) {
      i++
    }
    if (i >= len) {
      break
    }

    const headerStart = i
    let j = i
    while (j < len && stripped[j] !== '{') {
      j++
    }
    if (j >= len) {
      break
    } // trailing text with no block - nothing meaningful to keep

    const header = stripped.slice(headerStart, j).trim()

    let braceDepth = 0
    let k = j
    do {
      if (stripped[k] === '{') {
        braceDepth++
      } else if (stripped[k] === '}') {
        braceDepth--
      }
      k++
    } while (k < len && braceDepth > 0)
    const blockEnd = k
    const body = stripped.slice(j + 1, blockEnd - 1)

    if (header.startsWith('@') || body.includes('{')) {
      nodes.push({ kind: 'raw', text: stripped.slice(headerStart, blockEnd) })
    } else {
      const selectors = header.split(',').map(s => s.trim()).filter(Boolean)
      nodes.push({ kind: 'rule', selectors, declarations: parseDeclarations(body) })
    }
    i = blockEnd
  }

  return nodes
}

export function serializeCss (nodes: CssNode[]): string {
  return nodes.map(node => {
    if (node.kind === 'raw') {
      return node.text
    }
    const selector = node.selectors.join(',\n')
    const body = node.declarations
      .map(d => `  ${d.property}: ${d.value}${d.important ? ' !important' : ''};`)
      .join('\n')
    return `${selector} {\n${body}\n}`
  }).join('\n\n')
}
