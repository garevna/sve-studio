// What a person types as a link, turned into an address a browser opens:
// a web address (with https:// added when missing), a phone number
// (tel:) or an email address (mailto:). Empty stays empty.
export function linkHref (input: string): string {
  const value = input.trim()
  if (!value) {
    return ''
  }
  if (/^(?:https?:|mailto:|tel:|viber:|tg:|whatsapp:)/i.test(value)) {
    return value
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `mailto:${value}`
  }
  if (/^\+?[\d\s()-]{6,}$/.test(value)) {
    return `tel:${value.replace(/[^\d+]/g, '')}`
  }
  return `https://${value.replace(/^\/+/, '')}`
}
