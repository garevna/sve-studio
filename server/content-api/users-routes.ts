// Who I am, and - for a supervisor or an owner - who else is here.
//
//   GET    /api/users/me        my role, and the sections it opens
//   GET    /api/users           everyone who has signed in (owners excluded)
//   PUT    /api/users/:uid      { role }
//   DELETE /api/users/:uid
//
// The three that change anything are for supervisors and owners only. The
// rules they enforce are in users.ts, where the reasons for them are written
// down; this file is the doorway.
import type { AuthAccessOptions, CallerRole } from './middleware'
import type { StoredRole } from './users'
import { createRouter, readBody } from 'h3'
import { EDITOR_ROLES, sectionsForRole } from '../../src/configs/editor-roles'
import { apiError, defineApiHandler } from './handler'
import { listUsers, NO_ROLE, removeUser, RoleChangeError, setRole } from './users'

const ROLES = new Set<string>([...EDITOR_ROLES.map(role => role.value), NO_ROLE])

interface CallerContext {
  uid: string
  email: string
  name: string
  role: CallerRole
}

function caller (event: { context: Record<string, unknown> }): CallerContext {
  const found = event.context.caller as CallerContext | undefined
  if (!found) {
    throw apiError(401, 'Sign in first', 'sign-in')
  }
  return found
}

// A supervisor runs the site's people; an owner can do everything a
// supervisor can, and is not in the list themselves.
function requireSupervisor (event: { context: Record<string, unknown> }): CallerContext {
  const who = caller(event)
  if (who.role !== 'supervisor' && who.role !== 'owner') {
    throw apiError(403, 'Only a supervisor manages people', 'forbidden')
  }
  return who
}

export function createUsersRouter ({ owners, users }: AuthAccessOptions) {
  const router = createRouter()

  // The editor asks this at startup: it is both "am I signed in" and "which
  // of the home screen do I get".
  router.get('/me', defineApiHandler(event => {
    const who = caller(event)
    return {
      uid: who.uid,
      email: who.email,
      name: who.name,
      role: who.role,
      owner: who.role === 'owner',
      // A supervisor and an owner see everything; sectionsForRole knows it.
      sections: who.role === 'owner'
        ? sectionsForRole('supervisor').map(section => section.key)
        : (who.role === NO_ROLE ? [] : sectionsForRole(who.role).map(section => section.key)),
    }
  }))

  router.get('/', defineApiHandler(async event => {
    requireSupervisor(event)
    return { users: await listUsers(users, owners) }
  }))

  router.put('/:uid', defineApiHandler(async event => {
    const who = requireSupervisor(event)
    const uid = String(event.context.params?.uid || '')
    const body = await readBody(event).catch(() => null) as { role?: string } | null
    const role = String(body?.role || '')
    if (!ROLES.has(role)) {
      throw apiError(422, 'Unknown role', 'unknown-role')
    }
    try {
      return { user: await setRole(users, owners, who.uid, uid, role as StoredRole) }
    } catch (error) {
      throw roleError(error)
    }
  }))

  router.delete('/:uid', defineApiHandler(async event => {
    const who = requireSupervisor(event)
    try {
      await removeUser(users, owners, who.uid, String(event.context.params?.uid || ''))
      return { ok: true }
    } catch (error) {
      throw roleError(error)
    }
  }))

  return router
}

// The three refusals users.ts can raise, each said in a way the editor can
// show to the person who tried.
function roleError (error: unknown) {
  if (!(error instanceof RoleChangeError)) {
    return error
  }
  if (error.code === 'self') {
    return apiError(409, 'Nobody changes their own role - ask another supervisor', 'self')
  }
  if (error.code === 'owner') {
    return apiError(403, 'This account is set in the deployment and cannot be changed here', 'owner')
  }
  return apiError(404, 'No such user', 'not-found')
}
