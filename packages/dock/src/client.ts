import type { ClientApiDocument, DockCall, DockContext, DockDay, DockOption, DockOutgoing, DockRequest } from './types'
import { absoluteUrl, buildCall, fieldsOf, fillTemplate, getPath, resolveParams, withQuery } from './resolve'

// Something went wrong between the site and the client's API. `message` is
// for the people running the site (the problem log), `detail` the specifics.
export class DockError extends Error {
  constructor (message: string, readonly detail?: string) {
    super(message)
    this.name = 'DockError'
  }
}

export interface DockAnswer {
  status: number
  ok: boolean
  data: unknown
}

export interface DockOptions {
  document: () => ClientApiDocument | null | undefined
  // the site's own root ("/", "/sve-studio/" on GitHub Pages)
  root: () => string
  fetch?: typeof fetch
}

export function createDock ({ document, root, fetch: fetcher = (...args) => fetch(...args) }: DockOptions) {
  const cache = new Map<string, Promise<unknown>>()

  function address () {
    return { baseUrl: document()?.baseUrl, root: root() }
  }

  function request<R extends DockRequest['role']> (id: string | undefined, role: R): Extract<DockRequest, { role: R }> | null {
    const found = id ? document()?.requests.find(item => item.id === id) : undefined
    return found?.role === role ? found as Extract<DockRequest, { role: R }> : null
  }

  // One call, answered as JSON (or as text when it is not JSON).
  async function send (outgoing: DockOutgoing): Promise<DockAnswer> {
    let response: Response
    try {
      response = await fetcher(outgoing.url, {
        method: outgoing.method,
        headers: outgoing.body ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : { Accept: 'application/json' },
        body: outgoing.body ? JSON.stringify(outgoing.body) : undefined,
      })
    } catch (error) {
      throw new DockError(`No answer from ${outgoing.method} ${outgoing.url}`, error instanceof Error ? error.message : String(error))
    }
    const text = await response.text()
    let data: unknown = text
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      // not JSON - kept as text
    }
    return { status: response.status, ok: response.ok, data }
  }

  async function answerOf (outgoing: DockOutgoing): Promise<unknown> {
    const answer = await send(outgoing)
    if (!answer.ok) {
      throw new DockError(`${outgoing.method} ${outgoing.url} answered ${answer.status}`, typeof answer.data === 'string' ? answer.data.slice(0, 500) : JSON.stringify(answer.data).slice(0, 500))
    }
    return answer.data
  }

  // GETs are asked once per address while the page is open: a list of
  // destinations does not change between two clicks.
  function cached (outgoing: DockOutgoing): Promise<unknown> {
    if (outgoing.method !== 'GET') {
      return answerOf(outgoing)
    }
    let pending = cache.get(outgoing.url)
    if (!pending) {
      pending = answerOf(outgoing)
      cache.set(outgoing.url, pending)
      pending.catch(() => cache.delete(outgoing.url))
    }
    return pending
  }

  function listAt (data: unknown, path: string | undefined, what: string): unknown[] {
    const list = getPath(data, path)
    if (!Array.isArray(list)) {
      throw new DockError(`${what}: no list in the answer${path ? ` at "${path}"` : ''}`)
    }
    return list
  }

  // Every field a call reads has a value - otherwise there is nothing to ask.
  function ready (call: DockCall, context: DockContext): boolean {
    return [...fieldsOf(call.query), ...fieldsOf(call.body)].every(key => {
      const value = context.values[key]
      return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
    })
  }

  // The field keys a request reads.
  function reads (id: string | undefined): string[] {
    const found = id ? document()?.requests.find(item => item.id === id) : undefined
    if (!found) {
      return []
    }
    const keys = found.role === 'handoff'
      ? fieldsOf([...(found.session?.query ?? []), ...(found.session?.body ?? []), ...(found.target.query ?? [])])
      : fieldsOf([...(found.call.query ?? []), ...(found.call.body ?? [])])
    // a field read twice (a stay's first and last day) is one field
    return [...new Set(keys)]
  }

  return {
    reads,

    // The fields a request still waits for (no value yet).
    missing (id: string | undefined, values: Record<string, unknown>): string[] {
      return reads(id).filter(key => {
        const value = values[key]
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
      })
    },

    // A docking form by its id.
    form (id: string | undefined) {
      return id ? document()?.forms?.find(item => item.id === id) ?? null : null
    },

    // The role of a request (what a form's button does with it).
    roleOf (id: string | undefined) {
      return id ? document()?.requests.find(item => item.id === id)?.role ?? null : null
    },

    // The first list set up to be chosen as cards (it names a picture) - a
    // block that was never told which list gives its cards takes this one.
    cardsRequest (): string | undefined {
      return document()?.requests.find(item => item.role === 'options' && !!item.list.image)?.id
    },

    // The list a field chooses from.
    async options (id: string | undefined, context: DockContext): Promise<DockOption[]> {
      const found = request(id, 'options')
      if (!found || !ready(found.call, context)) {
        return []
      }
      const list = listAt(await cached(buildCall(found.call, context, address())), found.list.path, found.name)
      const { image, details, hint } = found.list
      return list.map(item => {
        const option: DockOption = {
          value: String(getPath(item, found.list.value) ?? ''),
          label: fillTemplate(found.list.label, item),
        }
        const picture = image ? getPath(item, image) : undefined
        if (typeof picture === 'string' && picture) {
          option.image = absoluteUrl(picture, address().baseUrl, address().root)
        }
        const points = details ? getPath(item, details) : undefined
        if (Array.isArray(points)) {
          option.details = points.map(String).filter(Boolean)
        } else if (typeof points === 'string' && points) {
          option.details = [points]
        }
        if (hint) {
          option.hint = fillTemplate(hint, item)
        }
        return option
      }).filter(option => option.value)
    },

    // The days a calendar offers for the month in context.system.month.
    async dates (id: string | undefined, context: DockContext): Promise<DockDay[] | null> {
      const found = request(id, 'dates')
      if (!found) {
        return null
      }
      if (!ready(found.call, context)) {
        return []
      }
      const list = listAt(await cached(buildCall(found.call, context, address())), found.result.path, found.name)
      return list.map(item => ({
        date: String(getPath(item, found.result.date) ?? '').slice(0, 10),
        hint: found.result.hint ? fillTemplate(found.result.hint, item) : undefined,
      })).filter(day => day.date)
    },

    // The address of the client's own engine for this visitor - after the
    // session request, in 'session' mode. The caller goes there.
    async handoff (id: string | undefined, context: DockContext): Promise<string> {
      const found = request(id, 'handoff')
      if (!found) {
        throw new DockError(`No handoff "${id ?? ''}" in client-api.json`)
      }
      let withAnswer = context
      if (found.mode === 'session') {
        if (!found.session) {
          throw new DockError(`${found.name}: the session request is not set`)
        }
        withAnswer = { ...context, response: await answerOf(buildCall(found.session, context, address())) }
      }
      const url = absoluteUrl(fillTemplate(found.target.url, withAnswer.response), address().baseUrl, address().root)
      return withQuery(url, resolveParams(found.target.query, withAnswer))
    },

    // A popup's answer, as it is.
    async answer (id: string | undefined, body: Record<string, unknown>): Promise<'sent' | 'no-endpoint'> {
      const found = request(id, 'answer')
      if (!found?.call.url) {
        return 'no-endpoint'
      }
      const outgoing = buildCall({ ...found.call, body: undefined }, { values: {}, system: { locale: '', page: '', return: '' } }, address())
      await answerOf({ ...outgoing, method: found.call.method === 'PUT' ? 'PUT' : 'POST', body })
      return 'sent'
    },

    // What a request sends, as it would go out now - the editor's preview.
    // A session handoff gives two: the session call, then the address the
    // visitor goes to (placeholders for the answer left as they are).
    plan (found: DockRequest, context: DockContext): DockOutgoing[] {
      const where = address()
      switch (found.role) {
        case 'handoff': {
          const calls: DockOutgoing[] = found.mode === 'session' && found.session ? [buildCall(found.session, context, where)] : []
          const url = absoluteUrl(context.response === undefined ? found.target.url : fillTemplate(found.target.url, context.response), where.baseUrl, where.root)
          const query = (found.target.query ?? []).map(param => param.source.from === 'response' && context.response === undefined
            ? [param.name, `{${param.source.path}}`] as [string, unknown]
            : null)
          const resolved = resolveParams(found.target.query?.filter(param => param.source.from !== 'response' || context.response !== undefined), context)
          calls.push({ url: withQuery(url, [...resolved, ...query.filter((item): item is [string, unknown] => item !== null)]), method: 'GET' })
          return calls
        }
        default: {
          return [buildCall(found.call, context, where)]
        }
      }
    },

    send,

    // Forget the cached lists (after the settings change in the editor).
    forget () {
      cache.clear()
    },
  }
}

export type Dock = ReturnType<typeof createDock>
