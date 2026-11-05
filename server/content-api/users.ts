// Who has signed in to the editor, and what each of them may do.
//
// The model is the one the Bible project arrived at, and the rules in it are
// there because of what goes wrong without them:
//   - an owner is a setting of the deployment, not a row here, so the list
//     cannot take the last administrator away;
//   - the list does not show owners and cannot change or remove them;
//   - nobody changes their own role, so nobody locks themselves out;
//   - removing somebody only drops the row - they come back on the next
//     sign-in with no rights, rather than being unable to sign in at all.
//
// Everyone who opens the editor is recorded on their first request (see
// `remember`), which is how a new person appears in the list to be given a
// role without anybody typing a user id anywhere.
import type { EditorRoleModel } from '../../src/configs/editor-roles'
import type { Caller } from './caller'
import { isOwner } from './caller'

// A person with no role yet: signed in, visible in the list, allowed to read
// and to write nothing. It is not one of the editor's roles on purpose -
// those all grant something.
export const NO_ROLE = 'none'
export type StoredRole = EditorRoleModel | typeof NO_ROLE

export interface UserRecord {
  uid: string
  email: string
  name: string
  role: StoredRole
  // Unix ms, so the list can put whoever was here last at the top.
  lastSeen: number
}

export interface UserView extends UserRecord {
  owner: boolean
}

// Any unstorage store (nitro.storage['content-users']). Typed structurally
// rather than imported, so this file stays testable without Nitro.
export interface UsersStore {
  getItem: (key: string) => Promise<unknown>
  setItem: (key: string, value: unknown) => Promise<void>
  removeItem: (key: string) => Promise<void>
  getKeys: (base?: string) => Promise<string[]>
}

const key = (uid: string) => `user:${uid}`

function record (value: unknown): UserRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const item = value as Partial<UserRecord>
  return typeof item.uid === 'string'
    ? {
        uid: item.uid,
        email: typeof item.email === 'string' ? item.email : '',
        name: typeof item.name === 'string' ? item.name : '',
        role: (item.role as StoredRole) || NO_ROLE,
        lastSeen: Number(item.lastSeen) || 0,
      }
    : null
}

export async function getUser (store: UsersStore, uid: string): Promise<UserRecord | null> {
  return record(await store.getItem(key(uid)))
}

// Called on every request that carries a token: keeps the name and address
// current (they change in the identity provider, not here) and the last-seen
// time, and creates the row the first time somebody appears.
export async function remember (store: UsersStore, caller: Caller, now = Date.now()): Promise<UserRecord> {
  const stored = await getUser(store, caller.uid)
  const updated: UserRecord = {
    uid: caller.uid,
    email: caller.email || stored?.email || '',
    name: caller.name || stored?.name || '',
    role: stored?.role ?? NO_ROLE,
    lastSeen: now,
  }
  await store.setItem(key(caller.uid), updated)
  return updated
}

// What a caller may do. An owner's answer never depends on the stored row -
// that is the whole point of owners.
export function roleOf (caller: Caller, stored: UserRecord | null, owners: string): StoredRole | 'owner' {
  return isOwner(caller, owners) ? 'owner' : (stored?.role ?? NO_ROLE)
}

// Everyone but the owners, whoever was here last at the top.
export async function listUsers (store: UsersStore, owners: string): Promise<UserView[]> {
  const keys = await store.getKeys('user:')
  const users: UserView[] = []
  for (const item of keys) {
    const found = record(await store.getItem(item))
    if (!found) {
      continue
    }
    // An owner by id can be told from the row; an owner by e-mail only if
    // the address was verified when they signed in, which is what the row
    // cannot say - so owners are matched by id here and the panel refuses
    // to change any of them again on the way in (see changeable).
    if (isOwner({ uid: found.uid, email: '', emailVerified: false }, owners)) {
      continue
    }
    users.push({ ...found, owner: false })
  }
  return users.toSorted((a, b) => b.lastSeen - a.lastSeen)
}

export class RoleChangeError extends Error {
  constructor (readonly code: 'not-found' | 'owner' | 'self') {
    super(code)
  }
}

async function changeable (store: UsersStore, owners: string, adminUid: string, uid: string): Promise<UserRecord> {
  // Nobody changes their own role. An administrator who demotes themselves
  // by accident has no way back, and on a site with one administrator that
  // is the end of the editor.
  if (uid === adminUid) {
    throw new RoleChangeError('self')
  }
  const found = await getUser(store, uid)
  if (!found) {
    throw new RoleChangeError('not-found')
  }
  if (isOwner({ uid: found.uid, email: found.email, emailVerified: false }, owners)) {
    throw new RoleChangeError('owner')
  }
  return found
}

export async function setRole (
  store: UsersStore,
  owners: string,
  adminUid: string,
  uid: string,
  role: StoredRole,
): Promise<UserView> {
  const found = await changeable(store, owners, adminUid, uid)
  const updated: UserRecord = { ...found, role }
  await store.setItem(key(uid), updated)
  return { ...updated, owner: false }
}

// Takes somebody off the list. They can still sign in; they come back with
// no role, which is a thing they can be given again - unlike an account
// that has been locked out.
export async function removeUser (store: UsersStore, owners: string, adminUid: string, uid: string): Promise<void> {
  await changeable(store, owners, adminUid, uid)
  await store.removeItem(key(uid))
}
