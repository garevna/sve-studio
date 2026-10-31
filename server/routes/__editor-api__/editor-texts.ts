// Dev only: saves the editor's interface texts, as edited on /editor-ui
// ("Тексти"), back into src/i18n/messages/<section>.json - so they ship with
// the next build.
//
// Only the texts change: a section that does not exist, or a key that is
// not already in its file, is refused - new keys come with the code that
// uses them.
import { promises as fs } from 'node:fs'
import path from 'node:path'

const LOCALES = ['uk', 'en', 'de'] as const
const SECTION = /^[A-Za-z][\w-]*$/

type Tree = { [key: string]: Tree | Record<(typeof LOCALES)[number], string> }

function isText (node: unknown): node is Record<string, string> {
  return !!node && typeof node === 'object' && 'uk' in node
}

// The incoming tree must have exactly the file's keys; returns the file's
// tree with the incoming texts in it.
function merged (current: Tree, incoming: unknown, at: string): Tree {
  if (!incoming || typeof incoming !== 'object') {
    throw createError({ statusCode: 400, statusMessage: `${at}: not an object` })
  }
  const input = incoming as Record<string, unknown>
  const result: Tree = {}
  for (const [key, node] of Object.entries(current)) {
    const where = at ? `${at}.${key}` : key
    if (!(key in input)) {
      throw createError({ statusCode: 400, statusMessage: `${where}: missing` })
    }
    if (isText(node)) {
      const text = input[key] as Record<string, unknown>
      const entry = {} as Record<(typeof LOCALES)[number], string>
      for (const locale of LOCALES) {
        if (typeof text?.[locale] !== 'string') {
          throw createError({ statusCode: 400, statusMessage: `${where}.${locale}: not a string` })
        }
        entry[locale] = text[locale] as string
      }
      if (entry.uk.trim() === '') {
        throw createError({ statusCode: 400, statusMessage: `${where}: the Ukrainian text cannot be empty` })
      }
      result[key] = entry
    } else {
      result[key] = merged(node as Tree, input[key], where)
    }
  }
  const extra = Object.keys(input).filter(key => !(key in current))
  if (extra.length > 0) {
    throw createError({ statusCode: 400, statusMessage: `${at || 'section'}: unknown keys ${extra.join(', ')}` })
  }
  return result
}

export default defineEventHandler(async event => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  if (getMethod(event) !== 'PUT') {
    throw createError({ statusCode: 405 })
  }
  const body = await readBody<{ sections?: Record<string, unknown> }>(event)
  const sections = body?.sections
  if (!sections || typeof sections !== 'object' || Object.keys(sections).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No sections' })
  }
  const dir = path.resolve('src/i18n/messages')
  const writes: [string, Tree][] = []
  for (const [section, texts] of Object.entries(sections)) {
    if (!SECTION.test(section)) {
      throw createError({ statusCode: 400, statusMessage: `Bad section name: ${section}` })
    }
    const file = path.join(dir, `${section}.json`)
    const current = await fs.readFile(file, 'utf8').then(raw => JSON.parse(raw) as Tree).catch(() => null)
    if (!current) {
      throw createError({ statusCode: 400, statusMessage: `No such section: ${section}` })
    }
    writes.push([file, merged(current, texts, '')])
  }
  // All checked first, then written - a bad section saves nothing.
  for (const [file, tree] of writes) {
    await fs.writeFile(file, `${JSON.stringify(tree, null, 2)}\n`)
  }
  return { saved: writes.length }
})
