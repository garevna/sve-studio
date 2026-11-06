// The "Користувачі" section's side of server/content-api/users-routes.ts:
// who I am, who else has signed in, and the role each of them has.
//
// Two things are deliberately NOT here:
//   - no list of roles: they come from configs/editor-roles.ts, the same
//     file the home screen and the server read;
//   - no sign-in: that is services/editor-auth.ts, shared with the inbox,
//     so one sign-in serves every section.
import type { EditorRoleModel, EditorSectionKey } from '@/configs/editor-roles'
import { appBase } from '@/utils/app-base'

// Signed in and waiting for a role: allowed to look, allowed to change
// nothing. Mirrors NO_ROLE in server/content-api/users.ts.
export const NO_ROLE = 'none'
export type PersonRole = EditorRoleModel | typeof NO_ROLE

export interface EditorPerson {
  uid: string
  email: string
  name: string
  role: PersonRole
  lastSeen: Date
}

// An owner is set in the deployment (NUXT_CONTENT_API_OWNERS), not in the
// list - which is why 'owner' can come back as a role but can never be
// given to anybody from here.
export interface EditorMe {
  uid: string
  email: string
  name: string
  role: PersonRole | 'owner'
  owner: boolean
  // Which of the home screen this account gets, as the server reads the
  // role's own list.
  sections: EditorSectionKey[]
}

// sign-in     - no token, or it has run out
// forbidden   - signed in, but this account may not do that
// self        - nobody changes their own role (409)
// owner       - that account is set in the deployment, not here
// not-found   - no such person in the list any more
// network     - the server did not answer
// server      - it answered with an error
export type UsersErrorCode = 'sign-in' | 'forbidden' | 'self' | 'owner' | 'not-found' | 'network' | 'server'

export class UsersError extends Error {
  constructor (public code: UsersErrorCode, detail = '') {
    super(detail || code)
  }
}

// The content API on this origin, under the app's own base ("/" in dev,
// "/sve-studio/" on GitHub Pages) - the same address stores/ajax.ts uses.
function endpoint (path: string): string {
  return `${location.origin}${appBase()}api/users${path}`
}

// The server names its refusals (handler.ts adds `code` to the body); the
// status is the fallback for anything that does not.
function codeOf (status: number, named: string | undefined): UsersErrorCode {
  switch (named) {
    case 'sign-in':
    case 'forbidden':
    case 'self':
    case 'owner':
    case 'not-found': { return named
    }
    default: { break
    }
  }
  if (status === 401) {
    return 'sign-in'
  }
  if (status === 403) {
    return 'forbidden'
  }
  if (status === 404) {
    return 'not-found'
  }
  return 'server'
}

type Answer<T> = { error?: string, code?: string } & T

async function call<T> (path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  if (!token) {
    throw new UsersError('sign-in')
  }
  let response: Response
  try {
    response = await fetch(endpoint(path), {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    throw new UsersError('network', String(error))
  }
  const answer = await response.json().catch(() => ({})) as Answer<T>
  if (!response.ok) {
    throw new UsersError(codeOf(response.status, answer.code), answer.error || String(response.status))
  }
  return answer
}

// Does this deployment keep the roles on the server?
//
// /api/users/me answers 401 when it does and nobody has signed in yet, and
// 404 when the content API has no sign-in at all - the in-browser demo, or a
// server left read-only. A static host with no API answers the editor's own
// index.html with 200, which is why the content type is checked too: that
// page is not an answer about roles. The in-browser API deliberately passes
// this one path through to the network (service-worker/content-api-sw.ts),
// so a worker in front of /api cannot hide a server from this question.
//
// Asked twice - once by app/plugins/01.content-api.client.ts, which decides
// on this answer whether to start the in-browser API at all, and once by
// stores/users.ts - so the answer is kept.
let enabled: boolean | null = null

export async function serverRolesEnabled (): Promise<boolean> {
  if (enabled !== null) {
    return enabled
  }
  try {
    const response = await fetch(endpoint('/me'), { cache: 'no-store', headers: { Accept: 'application/json' } })
    enabled = response.status === 401
      && (response.headers.get('content-type') || '').includes('json')
      // Belt and braces: an older worker that still answers this path.
      && response.headers.get('X-Content-Api') !== 'service-worker'
  } catch {
    // No server to ask (offline, the demo's service worker not running):
    // the editor keeps the role it is told in the interface.
    enabled = false
  }
  return enabled
}

function toPerson (raw: Omit<EditorPerson, 'lastSeen'> & { lastSeen: number }): EditorPerson {
  return { ...raw, lastSeen: new Date(raw.lastSeen || 0) }
}

export async function fetchMe (token: string | null): Promise<EditorMe> {
  return await call<EditorMe>('/me', token)
}

// Whoever was here last, first. Owners are not in it.
export async function fetchPeople (token: string | null): Promise<EditorPerson[]> {
  const { users } = await call<{ users: (Omit<EditorPerson, 'lastSeen'> & { lastSeen: number })[] }>('/', token)
  return users.map(item => toPerson(item))
}

export async function setPersonRole (token: string | null, uid: string, role: PersonRole): Promise<EditorPerson> {
  const { user } = await call<{ user: Omit<EditorPerson, 'lastSeen'> & { lastSeen: number } }>(`/${encodeURIComponent(uid)}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  return toPerson(user)
}

// Off the list, not out of the account: they can sign in again, with no
// role, and be given one.
export async function removePerson (token: string | null, uid: string): Promise<void> {
  await call(`/${encodeURIComponent(uid)}`, token, { method: 'DELETE' })
}
