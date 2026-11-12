import type { DockCall, DockContext, DockFormat, DockOutgoing, DockParam, DockPick, DockSource } from './types'

// Reading and writing a nested field: "data.items", "guests.adults".
export function getPath (value: unknown, path: string | undefined): unknown {
  if (!path) {
    return value
  }
  let current = value
  for (const part of path.split('.').filter(Boolean)) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function setPath (target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.').filter(Boolean)
  let current = target
  for (const part of parts.slice(0, -1)) {
    const next = current[part]
    current = next !== null && typeof next === 'object' && !Array.isArray(next)
      ? next as Record<string, unknown>
      : (current[part] = {}) as Record<string, unknown>
  }
  const last = parts.at(-1)
  if (last) {
    current[last] = value
  }
}

// "{name}, {country}" over an item; "{token}" or "{data.id}" over an answer.
// A placeholder with nothing behind it is left empty, not "undefined".
export function fillTemplate (template: string, source: unknown): string {
  return template.replace(/\{([\w.]+)\}/g, (_, path: string) => {
    const value = getPath(source, path)
    return value === undefined || value === null ? '' : String(value)
  })
}

function pickOf (value: unknown, pick: DockPick | undefined): unknown {
  if (!Array.isArray(value)) {
    return pick === 'count' ? (value === undefined || value === null || value === '' ? 0 : 1) : value
  }
  switch (pick) {
    case 'first': {
      return value[0]
    }
    case 'last': {
      return value.at(-1)
    }
    case 'count': {
      return value.length
    }
    case 'all': {
      return value.join(',')
    }
    default: {
      return value
    }
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

export function formatValue (value: unknown, format: DockFormat | undefined): unknown {
  if (value === undefined || value === null || !format || format === 'as-is') {
    return value
  }
  if (format === 'number') {
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  if (format === 'text') {
    return String(value)
  }
  const date = ISO_DATE.exec(String(value))
  if (!date) {
    return value
  }
  const [, year, month, day] = date
  switch (format) {
    case 'DD.MM.YYYY': {
      return `${day}.${month}.${year}`
    }
    case 'MM/DD/YYYY': {
      return `${month}/${day}/${year}`
    }
    default: {
      return `${year}-${month}-${day}`
    }
  }
}

export function resolveSource (source: DockSource, context: DockContext): unknown {
  switch (source.from) {
    case 'field': {
      return formatValue(pickOf(context.values[source.key], source.pick), source.format)
    }
    case 'system': {
      const value = source.value === 'now' ? new Date().toISOString() : context.system[source.value]
      return formatValue(value, source.format)
    }
    case 'const': {
      return source.value
    }
    case 'response': {
      return getPath(context.response, source.path)
    }
  }
}

function isEmpty (value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

// The named values of a request. One with no value is left out, not sent
// empty: "children=" is not the same as no children parameter for most APIs.
export function resolveParams (params: DockParam[] | undefined, context: DockContext): [string, unknown][] {
  return (params ?? [])
    .filter(param => param.name)
    .map(param => [param.name, resolveSource(param.source, context)] as [string, unknown])
    .filter(([, value]) => !isEmpty(value))
}

// An address of the document: absolute as it is, a relative one under the
// client's base address - or, without one, under the site's own root.
export function absoluteUrl (url: string, baseUrl: string | undefined, root: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  const base = baseUrl?.trim() || root
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

export function withQuery (url: string, query: [string, unknown][]): string {
  if (query.length === 0) {
    return url
  }
  const search = query.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`).join('&')
  return `${url}${url.includes('?') ? '&' : '?'}${search}`
}

export interface DockAddress {
  baseUrl?: string
  root: string
}

// One call as it will go out: the address with its query, the body with its
// nested fields. Placeholders in the address ("{token}") are filled from the
// session's answer.
export function buildCall (call: DockCall, context: DockContext, address: DockAddress): DockOutgoing {
  const method = call.method ?? 'GET'
  const url = withQuery(absoluteUrl(fillTemplate(call.url, context.response), address.baseUrl, address.root), resolveParams(call.query, context))
  if (method === 'GET' || !call.body?.length) {
    return { url, method }
  }
  const body: Record<string, unknown> = {}
  for (const [name, value] of resolveParams(call.body, context)) {
    setPath(body, name, value)
  }
  return { url, method, body }
}

// The fields a call reads - what a lookup waits for before it can ask.
export function fieldsOf (params: DockParam[] | undefined): string[] {
  return (params ?? []).flatMap(param => (param.source.from === 'field' ? [param.source.key] : []))
}
