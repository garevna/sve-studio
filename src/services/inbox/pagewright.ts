// The Pagewright demo's own inbox: the admin signs in with Google (Firebase
// Auth of the demo's project), and the demo's feedback worker
// (services/feedback-telegram, /admin/*) reads the messages from Firestore
// and saves the answers - it checks the sign-in and lets in only the
// e-mails in its ADMIN_EMAILS. Nothing here reads Firestore directly, so
// its security rules stay the visitors' only.
// Not for a client's site: its own API gets its own adapter (index.ts).
import type { FirebaseOptions } from 'firebase/app'
import type { InboxAdapter, InboxMessage, InboxReply } from './types'
import { editorAuth, EditorAuthError } from '@/services/editor-auth'
import { InboxError } from './types'

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

export function pagewrightInbox (config: FirebaseOptions, endpoint: string): InboxAdapter {
  // The editor's one sign-in, shared with the "Користувачі" section and with
  // the saves the editor makes - see services/editor-auth.ts.
  const session = editorAuth(config)

  async function call<T> (path: string, init: RequestInit = {}): Promise<T> {
    const token = await session.token()
    if (!token) {
      throw new InboxError('sign-in')
    }
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
      // EditorUser and InboxUser are the same three fields.
      return await session.watchUser(onUser)
    },

    async signIn () {
      try {
        return await session.signIn()
      } catch (error) {
        // The section speaks in its own error codes, so the shared sign-in's
        // are translated here rather than leaking out of the adapter.
        const detail = error instanceof Error ? error.message : String(error)
        throw new InboxError(error instanceof EditorAuthError && error.code === 'domain' ? 'domain' : 'server', detail)
      }
    },

    async signOut () {
      await session.signOut()
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
