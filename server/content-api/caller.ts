// Who is asking: a Firebase ID token verified against Google's own signing
// keys, and the owners who are above the user list entirely.
//
// Dependency-free on purpose. The same verification is written twice more in
// this project - services/feedback-telegram and services/ai-agent - because a
// worker deployed on its own cannot import from here. This copy is the one
// the Nitro server uses; if one of them changes, change all three.

// Firebase signs its ID tokens with these keys, rotated every few hours.
const FIREBASE_KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

let cachedKeys: { keys: JsonWebKey[], expires: number } = { keys: [], expires: 0 }

async function signingKeys (): Promise<JsonWebKey[]> {
  if (Date.now() < cachedKeys.expires) {
    return cachedKeys.keys
  }
  const response = await fetch(FIREBASE_KEYS)
  const { keys = [] } = await response.json() as { keys?: JsonWebKey[] }
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control') || '')?.[1]) || 3600
  cachedKeys = { keys, expires: Date.now() + maxAge * 1000 }
  return keys
}

function fromBase64url (part: string): Uint8Array {
  return Uint8Array.from(atob(part.replaceAll('-', '+').replaceAll('_', '/')), char => char.codePointAt(0)!)
}

function jsonPart (part: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(fromBase64url(part))) as Record<string, unknown>
}

export interface Caller {
  uid: string
  email: string
  // The app does not verify e-mail addresses itself, so only a verified one
  // (Google sign-in, say) says who somebody is. An unverified address is
  // carried for display and never trusted - in particular, never matched
  // against the owners.
  emailVerified: boolean
  name: string
}

// The caller behind a request, or null when there is no token, it is not
// this project's, it is not signed by Firebase, or it has expired.
export async function callerOf (authorization: string, projectId: string): Promise<Caller | null> {
  const token = /^Bearer\s+(\S+)$/.exec(authorization || '')?.[1] || ''
  const [head, body, signature] = token.split('.')
  if (!head || !body || !signature || !projectId) {
    return null
  }
  try {
    const header = jsonPart(head)
    const claims = jsonPart(body)
    const now = Date.now() / 1000
    const fresh = Number(claims.exp) > now && Number(claims.iat) <= now + 300
    if (header.alg !== 'RS256' || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` || !fresh) {
      return null
    }
    const jwk = (await signingKeys()).find(key => (key as { kid?: string }).kid === header.kid)
    if (!jwk) {
      return null
    }
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      fromBase64url(signature),
      new TextEncoder().encode(`${head}.${body}`),
    )
    if (!valid) {
      return null
    }
    return {
      uid: String(claims.user_id || claims.sub || ''),
      email: typeof claims.email === 'string' ? claims.email : '',
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === 'string' ? claims.name : '',
    }
  } catch {
    return null
  }
}

// The owners are a setting of the deployment (OWNERS): Firebase user ids and
// verified e-mail addresses, comma separated. They may do everything, the
// user list does not show them and cannot change or remove them - which is
// what makes it safe to hand the last supervisor's seat to a client and
// still be able to put things right afterwards.
export function isOwner (caller: Pick<Caller, 'uid' | 'email' | 'emailVerified'>, owners: string): boolean {
  const list = (owners || '').split(',').map(entry => entry.trim()).filter(Boolean)
  // Ids are case sensitive; e-mail addresses are not.
  if (caller.uid && list.includes(caller.uid)) {
    return true
  }
  if (!caller.emailVerified || !caller.email) {
    return false
  }
  const email = caller.email.toLowerCase()
  return list.some(entry => entry.toLowerCase() === email)
}
