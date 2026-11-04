// The editor's "Повідомлення" section: the messages visitors sent through
// the site's feedback forms, and the answers to them. The section talks to
// an InboxAdapter only; which one is picked from global.json (index.ts).
// The demo's own is pagewright.ts - a client's site with its own API gets
// an adapter of its own and nothing else changes.

export type ContactVia = 'telegram' | 'viber' | 'whatsapp' | 'email'

export interface InboxContact {
  via: ContactVia
  value: string
}

export interface InboxReply {
  text: string
  at: Date
}

export interface InboxMessage {
  id: string
  name: string
  email: string
  contact: InboxContact | null
  // 'message', 'call-request'... - the form it came from.
  kind: string
  text: string
  page: string
  locale: string
  createdAt: Date
  replies: InboxReply[]
}

export interface InboxUser {
  email: string
  name: string
  photo: string
}

// sign-in      - nobody is signed in (or the sign-in has run out)
// not-admin    - signed in, but this account may not read the messages
// domain       - sign-in is not allowed from this site's address
// network      - the service did not answer
// server       - it answered with an error
export type InboxErrorCode = 'sign-in' | 'not-admin' | 'domain' | 'network' | 'server'

export class InboxError extends Error {
  constructor (public code: InboxErrorCode, detail = '') {
    super(detail || code)
  }
}

export interface InboxAdapter {
  // Called now and on every sign-in/out; returns the way to stop listening.
  watchUser: (onUser: (user: InboxUser | null) => void) => Promise<() => void>
  // false - the person closed the sign-in window.
  signIn: () => Promise<boolean>
  signOut: () => Promise<void>
  // Newest first.
  list: () => Promise<InboxMessage[]>
  // telegram: the answer was shown in the messenger chat as well.
  reply: (messageId: string, text: string) => Promise<{ reply: InboxReply, telegram: boolean }>
  // Gone everywhere: the visitor's account and the messenger chat too.
  remove: (messageId: string) => Promise<void>
}
