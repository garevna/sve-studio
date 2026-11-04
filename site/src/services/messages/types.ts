// A message a signed-in visitor sent through a feedback form, and the
// replies to it (services/messages/firebase.ts).

export type ContactVia = 'telegram' | 'viber' | 'whatsapp' | 'email'

export interface MessageContact {
  via: ContactVia
  value: string
}

// What the form writes (the date and the empty replies are added on save).
export interface MessageDraft {
  uid: string
  name: string
  email: string
  contact: MessageContact | null
  kind: string
  text: string
  page: string
  locale: string
}

export interface SiteMessage {
  id: string
  kind: string
  text: string
  contact: MessageContact | null
  page: string
  createdAt: Date
  replies: { text: string, at: Date }[]
}
