// The kinds of feedback form a site can show, and which fields each one
// asks for. The same list lives in the site (site/src/configs/
// feedback-forms.ts) - keep the two in step.
//
// The words here are what the site's visitors read, so they come in every
// site language.

export type FeedbackField = 'name' | 'phone' | 'email' | 'message' | 'date' | 'rating'

type Words = { uk: string, en: string, de: string }

export interface FeedbackFormKind {
  id: string
  icon: string
  fields: FeedbackField[]
  // The label of the message field, where the kind has one.
  messageLabel?: Words
  button: Words
}

export const FEEDBACK_FORM_KINDS: FeedbackFormKind[] = [
  {
    id: 'call-request',
    icon: 'mdi-phone-in-talk',
    fields: ['name', 'phone'],
    button: { uk: 'Замовити дзвінок', en: 'Request a call', de: 'Rückruf anfordern' },
  },
  {
    id: 'message',
    icon: 'mdi-message-text-outline',
    fields: ['name', 'phone', 'message'],
    messageLabel: { uk: 'Ваше повідомлення', en: 'Your message', de: 'Ihre Nachricht' },
    button: { uk: 'Надіслати', en: 'Send', de: 'Senden' },
  },
  {
    id: 'question',
    icon: 'mdi-help-circle-outline',
    fields: ['name', 'email', 'message'],
    messageLabel: { uk: 'Ваше питання', en: 'Your question', de: 'Ihre Frage' },
    button: { uk: 'Поставити питання', en: 'Ask a question', de: 'Frage stellen' },
  },
  {
    id: 'quote',
    icon: 'mdi-calculator-variant-outline',
    fields: ['name', 'phone', 'email', 'message'],
    messageLabel: { uk: 'Опишіть задачу', en: 'Describe your task', de: 'Beschreiben Sie Ihre Aufgabe' },
    button: { uk: 'Отримати розрахунок', en: 'Get a quote', de: 'Angebot anfordern' },
  },
  {
    id: 'booking',
    icon: 'mdi-calendar-clock',
    fields: ['name', 'phone', 'date'],
    button: { uk: 'Записатися', en: 'Book', de: 'Termin buchen' },
  },
  {
    id: 'review',
    icon: 'mdi-star-outline',
    fields: ['name', 'rating', 'message'],
    messageLabel: { uk: 'Ваш відгук', en: 'Your review', de: 'Ihre Bewertung' },
    button: { uk: 'Залишити відгук', en: 'Leave a review', de: 'Bewertung abgeben' },
  },
  {
    id: 'subscribe',
    icon: 'mdi-email-newsletter',
    fields: ['email'],
    button: { uk: 'Підписатися', en: 'Subscribe', de: 'Abonnieren' },
  },
]

// The field labels every kind shares.
export const FEEDBACK_FIELD_LABELS: Record<Exclude<FeedbackField, 'message' | 'rating'>, Words> = {
  name: { uk: 'Імʼя', en: 'Name', de: 'Name' },
  phone: { uk: 'Телефон', en: 'Phone', de: 'Telefon' },
  email: { uk: 'Email', en: 'Email', de: 'E-Mail' },
  date: { uk: 'Бажана дата', en: 'Preferred date', de: 'Wunschtermin' },
}

// A form saved before a kind was chosen is a callback form - that is what
// the footer card always was.
export function feedbackFormKind (id: string | undefined): FeedbackFormKind {
  return FEEDBACK_FORM_KINDS.find(kind => kind.id === id) ?? FEEDBACK_FORM_KINDS[0]!
}

// How to get back to the visitor: a messenger first, e-mail last.
export const FEEDBACK_CONTACT = {
  label: { uk: 'Як з вами зв’язатися', en: 'How to reach you', de: 'Wie wir Sie erreichen' },
  ways: [
    { via: 'telegram', name: 'Telegram', placeholder: { uk: '@нік або номер', en: '@username or number', de: '@Benutzername oder Nummer' } },
    { via: 'viber', name: 'Viber', placeholder: { uk: 'Номер телефону', en: 'Phone number', de: 'Telefonnummer' } },
    { via: 'whatsapp', name: 'WhatsApp', placeholder: { uk: 'Номер телефону', en: 'Phone number', de: 'Telefonnummer' } },
    { via: 'email', name: 'Email', placeholder: { uk: 'Ваша пошта', en: 'Your email', de: 'Ihre E-Mail' } },
  ] as const,
  signedIn: {
    uk: 'Відповідь прийде у ваш особистий кабінет. Контакт - за бажанням.',
    en: 'The reply will come to your personal account. A contact is optional.',
    de: 'Die Antwort kommt in Ihren persönlichen Bereich. Ein Kontakt ist optional.',
  },
} satisfies { label: Words, ways: readonly { via: string, name: string, placeholder: Words }[], signedIn: Words }
