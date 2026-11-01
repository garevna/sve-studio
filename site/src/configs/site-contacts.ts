// The site's contacts - phones, emails, the address, any other line (opening
// hours, say). They have one source: global.json "contacts" (Загальні
// налаштування -> Контакти). A line on a page or in the footer refers to one
// by `contact: "<id>"` instead of holding a copy, and shows its text - and,
// for a phone or an email, a link to call or write - when it is drawn. So a
// number is changed in one place only.
//
// NOTE: site/src/configs/site-contacts.ts is an exact copy - keep
// the two identical.

export type ContactKind = 'phone' | 'email' | 'address' | 'text'
export type Translated = Record<string, string>

export interface SiteContact {
  id: string
  kind: ContactKind
  // A phone or an email: written once, the same in every language.
  value?: string
  // An address or any other line: per language.
  text?: Translated
}

export const CONTACT_KINDS: ContactKind[] = ['phone', 'email', 'address', 'text']

// The icon a new line for a contact starts with.
export const CONTACT_ICONS: Record<ContactKind, string> = {
  phone: 'mdi-phone-outline',
  email: 'mdi-email-outline',
  address: 'mdi-map-marker-outline',
  text: 'mdi-information-outline',
}

export function newContactId (contacts: SiteContact[]): string {
  let index = contacts.length + 1
  while (contacts.some(contact => contact.id === `contact-${index}`)) {
    index++
  }
  return `contact-${index}`
}

export function contactOf (id: string | undefined, contacts: SiteContact[] | null | undefined): SiteContact | null {
  if (!id) {
    return null
  }
  return contacts?.find(contact => contact.id === id) ?? null
}

// What the line shows.
export function contactText (contact: SiteContact, locale: string): string {
  if (contact.kind === 'phone' || contact.kind === 'email') {
    return contact.value ?? ''
  }
  return contact.text?.[locale] || contact.text?.uk || Object.values(contact.text ?? {}).find(Boolean) || ''
}

// Where a click on it leads: a call, a letter, the address on a map.
export function contactHref (contact: SiteContact): string {
  const value = (contact.value ?? '').trim()
  if (contact.kind === 'phone' && value) {
    return `tel:${value.replace(/[^\d+]/g, '')}`
  }
  if (contact.kind === 'email' && value) {
    return `mailto:${value}`
  }
  if (contact.kind === 'address') {
    const text = contactText(contact, 'uk').trim()
    return text ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}` : ''
  }
  return ''
}
