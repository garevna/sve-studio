// The Pagewright demo's own inbox: the admin signs in with Google (Firebase
// Auth of the demo's project), and the demo's feedback worker
// (services/feedback-telegram, /admin/*) reads the messages from Firestore
// and saves the answers - it checks the sign-in and lets in only the
// e-mails in its ADMIN_EMAILS. Nothing here reads Firestore directly, so
// its security rules stay the visitors' only.
// Not for a client's site: its own API gets its own adapter (index.ts).
import type { FirebaseOptions } from 'firebase/app'
import type * as FirebaseAuth from 'firebase/auth'
import type { InboxAdapter, InboxMessage, InboxReply, InboxUser } from './types'
import { InboxError } from './types'

// A Firebase app of its own, so nothing else in the editor can clash with it.
const APP_NAME = 'pagewright-inbox'

type RawMessage = Omit<InboxMessage, 'createdAt' | 'replies'> & {
  createdAt: string
  replies: { text: string, at: string }[]
}

function toDate (value: string): Date {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function toMessage (raw: RawMessage): InboxMessage {
  return {
    ...raw,
    createdAt: toDate(raw.createdAt),
    replies: raw.replies.map(item => ({ text: item.text, at: toDate(item.at) })),
  }
}

function toUser (user: { email: string | null, displayName: string | null, photoURL: string | null } | null): InboxUser | null {
  return user ? { email: user.email ?? '', name: user.displayName ?? '', photo: user.photoURL ?? '' } : null
}

export function pagewrightInbox (config: FirebaseOptions, endpoint: string): InboxAdapter {
  let ready: Promise<{ auth: FirebaseAuth.Auth, module: typeof FirebaseAuth }> | null = null

  // Firebase is loaded only when the section is opened.
  function firebase () {
    ready ??= (async () => {
      const [app, module] = await Promise.all([import('firebase/app'), import('firebase/auth')])
      const instance = app.getApps().find(item => item.name === APP_NAME) ?? app.initializeApp(config, APP_NAME)
      return { auth: module.getAuth(instance), module }
    })()
    return ready
  }

  async function call<T> (path: string, init: RequestInit = {}): Promise<T> {
    const { auth } = await firebase()
    await auth.authStateReady()
    if (!auth.currentUser) {
      throw new InboxError('sign-in')
    }
    const token = await auth.currentUser.getIdToken()
    let response: Response
    try {
      response = await fetch(`${endpoint.replace(/\/+$/, '')}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      })
    } catch (error) {
      throw new InboxError('network', String(error))
    }
    const answer = await response.json().catch(() => ({})) as { ok?: boolean, error?: string } & T
    if (!response.ok || !answer.ok) {
      const code = answer.error === 'not-admin' || answer.error === 'sign-in' ? answer.error : 'server'
      throw new InboxError(code, answer.error || String(response.status))
    }
    return answer
  }

  return {
    async watchUser (onUser) {
      const { auth, module } = await firebase()
      return module.onAuthStateChanged(auth, user => onUser(toUser(user)))
    },

    async signIn () {
      const { auth, module } = await firebase()
      const provider = new module.GoogleAuthProvider()
      // Always the account picker: the one remembered may not be the admin.
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await module.signInWithPopup(auth, provider)
        return true
      } catch (error) {
        const code = (error as { code?: string }).code ?? ''
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return false
        }
        throw new InboxError(code === 'auth/unauthorized-domain' ? 'domain' : 'server', code)
      }
    },

    async signOut () {
      const { auth, module } = await firebase()
      await module.signOut(auth)
    },

    async list () {
      const { messages } = await call<{ messages: RawMessage[] }>('/admin/messages')
      return messages.map(item => toMessage(item))
    },

    async reply (messageId, text) {
      const answer = await call<{ reply: { text: string, at: string }, telegram: boolean }>('/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text }),
      })
      const reply: InboxReply = { text: answer.reply.text, at: toDate(answer.reply.at) }
      return { reply, telegram: answer.telegram }
    },

    async remove (messageId) {
      await call('/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
    },
  }
}
