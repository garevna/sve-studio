// The editor has no login of its own. The host system writes an access
// token into localStorage under this key before opening the editor window,
// and the editor reads it at bootstrap (see main.ts's readLaunchToken) and
// sends it as `Authorization: Bearer <token>` on every request.
//
// The KEY is a contract with the backend - renaming it here silently breaks
// every launch until the backend is changed to match.
export const TOKEN_STORAGE_KEY = 'editor-access-token'

// Nothing here inspects or validates the token: that is the server's
// answer to give. A 401 sends stores/ajax.ts to /user/refresh, and the
// fresh token it gets back is written here too - so a reload continues
// with the renewed one instead of the stale value the host system left
// behind, which would 401 all over again.
//
// Every accessor is guarded: localStorage can throw outright (private
// browsing, storage disabled by policy), and a browser that refuses it
// should still give a working - if read-only - session rather than a blank
// screen.
export function readStoredToken (): string {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

// Written by the legacy `?token=...` launch (main.ts) and by every
// successful refresh, so both leave the same stored token behind as a
// backend-written one.
export function storeToken (token: string) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // Non-fatal, see above.
  }
}

// Only on a refresh that itself failed: the session is definitively over,
// and keeping a token the server rejects would mean every later reload
// silently repeating the same doomed request round-trip.
export function clearStoredToken () {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Non-fatal, see above.
  }
}

// When this token stops being accepted, as a timestamp in ms - or null if
// the payload doesn't say. Read so the editor can renew a token BEFORE it
// dies rather than after: the access token lives 15 minutes, so waiting for
// a refusal would mean an interrupted save roughly every quarter of an
// hour, and the reactive path in stores/ajax.ts would be doing all the
// work.
//
// The claim is `expire` (unix seconds) - this API issues no standard `exp`
// at all, confirmed by the backend and on a live token. `exp` is still read
// first in case that ever changes. Nothing here VERIFIES the token - the
// signature is the server's business, and a payload that can't be read
// returns null, which the caller treats as "assume the worst and refresh".
export function tokenExpiryMs (token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }
    // base64url -> base64 for atob. split/join rather than replaceAll: the
    // project's TS target is below es2021, where replaceAll isn't available.
    const claims = JSON.parse(atob(payload.split('-').join('+').split('_').join('/'))) as Record<string, unknown>
    const seconds = claims['exp'] ?? claims['expire']
    return typeof seconds === 'number' && Number.isFinite(seconds) ? seconds * 1000 : null
  } catch {
    return null
  }
}

// /user/refresh answers 200 with {"token": "<jwt>", "refresh": "<jwt>"} -
// confirmed by the backend. Only `token` is ours to take: `refresh` rides
// in a cookie the admin panel manages, and storing a copy of it would mean
// keeping a credential we have no business holding.
//
// The shape check is not ceremony: an endpoint that answers 200 with "ok"
// or an error object must not have that installed as a credential, and the
// failure would otherwise surface much later as an unexplainable 403.
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/

export function extractToken (payload: unknown): string {
  const raw = (payload as { token?: unknown } | null)?.token
  const value = typeof raw === 'string' ? raw.trim() : ''
  return JWT_SHAPE.test(value) ? value : ''
}
