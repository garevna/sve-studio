// Dev only: saves the editor's colour schemes, as edited on the kit's
// showcase page (/editor-ui), back into the kit's own source -
// packages/editor-ui/src/looks.json - so they ship with the next build.
//
// In a production build: 404. Users only switch between the schemes.
import { promises as fs } from 'node:fs'
import path from 'node:path'

const COLOR = /^#[\da-f]{6}([\da-f]{2})?$/i

type LookInput = { id?: unknown, name?: unknown, colors?: Record<string, unknown> }

export default defineEventHandler(async event => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  if (getMethod(event) !== 'PUT') {
    throw createError({ statusCode: 405 })
  }
  const body = await readBody<{ default?: unknown, looks?: LookInput[] }>(event)
  const looks = body?.looks
  if (!Array.isArray(looks) || looks.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No looks' })
  }
  const ids = new Set<string>()
  for (const look of looks) {
    if (typeof look.id !== 'string' || !/^[a-z][\w-]*$/.test(look.id) || ids.has(look.id)) {
      throw createError({ statusCode: 400, statusMessage: `Bad look id: ${String(look.id)}` })
    }
    ids.add(look.id)
    for (const [name, value] of Object.entries(look.colors ?? {})) {
      if (typeof value !== 'string' || !COLOR.test(value)) {
        throw createError({ statusCode: 400, statusMessage: `${look.id}: ${name} is not a colour (#RRGGBB or #RRGGBBAA)` })
      }
    }
  }
  if (typeof body.default !== 'string' || !ids.has(body.default)) {
    throw createError({ statusCode: 400, statusMessage: 'The default look is not in the list' })
  }
  const file = path.resolve('packages/editor-ui/src/looks.json')
  await fs.writeFile(file, `${JSON.stringify({ default: body.default, looks }, null, 2)}\n`)
  return { saved: looks.length }
})
