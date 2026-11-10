// The problem log: what went wrong in the editor or on the site, kept where
// the people running the deployment can read it - not in visitors' browser
// consoles, which nobody reads and which must stay clean.
//
//   POST   /api/log   one entry (anybody: a visitor's browser reports too)
//   GET    /api/log   the entries, newest first      (supervisor, owner)
//   DELETE /api/log   all of them                    (supervisor, owner)
//
// Who reads: with sign-in on (access 'auth') a supervisor or an owner; in the
// in-browser demo (access 'open') the visitor, whose log it alone is; on a
// shared server with no sign-in (access 'read-only') nobody - what visitors
// report there is kept, but not handed to whoever asks.
//
// Kept one storage key a day, at most MAX_PER_DAY entries a day, for
// KEEP_DAYS days. Big fields are cut, so a report can never fill the store.
import type { Storage } from 'unstorage'
import type { CallerRole, WriteAccess } from './middleware'
import { createRouter, defineEventHandler, getHeader, setResponseStatus } from 'h3'
import { readBodyText } from './handler'

export interface LogEntry {
  at: string
  level: 'error' | 'warn'
  // which app: the editor or the site
  app: 'editor' | 'site'
  // where in it (a module or a part of the page)
  source: string
  message: string
  detail?: string
  page?: string
  agent?: string
}

const MAX_PER_DAY = 500
const KEEP_DAYS = 14
const PER_MINUTE = 30

function clip (value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function dayKey (date: Date): string {
  return `day:${date.toISOString().slice(0, 10)}`
}

// A browser stuck in a loop reports the same thing many times a second.
const recent = new Map<string, number[]>()
function tooMany (who: string): boolean {
  const now = Date.now()
  const times = (recent.get(who) ?? []).filter(time => now - time < 60_000)
  times.push(now)
  recent.set(who, times)
  if (recent.size > 1000) {
    recent.clear()
  }
  return times.length > PER_MINUTE
}

function mayRead (access: WriteAccess, role: CallerRole | undefined): boolean {
  if (access === 'open') {
    return true
  }
  return access === 'auth' && (role === 'supervisor' || role === 'owner')
}

async function append (store: Storage, entry: LogEntry) {
  const key = dayKey(new Date())
  const day = (await store.getItem<LogEntry[]>(key)) ?? []
  if (day.length < MAX_PER_DAY) {
    day.push(entry)
    await store.setItem(key, day)
  }
  // the days past keeping
  const oldest = dayKey(new Date(Date.now() - KEEP_DAYS * 86_400_000))
  for (const old of (await store.getKeys('day')).filter(name => name < oldest)) {
    await store.removeItem(old)
  }
}

export function createLogRouter (store: Storage | undefined, access: WriteAccess) {
  const router = createRouter()
  let writing: Promise<void> = Promise.resolve()

  router.post('/', defineEventHandler(async event => {
    setResponseStatus(event, 204)
    if (!store) {
      return null
    }
    const who = getHeader(event, 'x-forwarded-for') || getHeader(event, 'cf-connecting-ip') || 'local'
    if (tooMany(who)) {
      return null
    }
    // Through the web Request (handler.ts): h3's readBody needs Node's
    // Buffer, which the demo's service worker lacks.
    const body = await readBodyText(event).then(text => JSON.parse(text) as Partial<LogEntry>).catch(() => null)
    if (!body || typeof body !== 'object' || !body.message) {
      return null
    }
    const entry: LogEntry = {
      at: new Date().toISOString(),
      level: body.level === 'warn' ? 'warn' : 'error',
      app: body.app === 'site' ? 'site' : 'editor',
      source: clip(body.source, 80),
      message: clip(body.message, 500),
      detail: clip(body.detail, 2000) || undefined,
      page: clip(body.page, 300) || undefined,
      agent: clip(getHeader(event, 'user-agent'), 200) || undefined,
    }
    // One after another: two reports at once would each read the day and
    // write it back, and one of them would be lost.
    writing = writing.then(() => append(store, entry)).catch(() => {})
    await writing
    return null
  }))

  router.get('/', defineEventHandler(async event => {
    if (!mayRead(access, (event.context.caller as { role?: CallerRole } | undefined)?.role)) {
      setResponseStatus(event, 403)
      return { error: 'Only a supervisor reads the log', code: 'forbidden' }
    }
    if (!store) {
      return { entries: [] }
    }
    const days = (await store.getKeys('day')).toSorted().toReversed()
    const entries: LogEntry[] = []
    for (const day of days) {
      entries.push(...((await store.getItem<LogEntry[]>(day)) ?? []).toReversed())
    }
    return { entries }
  }))

  router.delete('/', defineEventHandler(async event => {
    if (!mayRead(access, (event.context.caller as { role?: CallerRole } | undefined)?.role)) {
      setResponseStatus(event, 403)
      return { error: 'Only a supervisor clears the log', code: 'forbidden' }
    }
    if (store) {
      for (const day of await store.getKeys('day')) {
        await store.removeItem(day)
      }
    }
    setResponseStatus(event, 204)
    return null
  }))

  return router
}
