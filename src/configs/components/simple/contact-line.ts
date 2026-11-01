import type { SiteContact } from '@/configs/site-contacts'
import { CONTACT_ICONS, contactText } from '@/configs/site-contacts'
import { siteLocales } from '@/utils/locale-text'
import { textWithIcon } from './text-with-icon'

// A ready line for one of the site's contacts: an icon for its kind and a
// reference to it ("contact"). Its text is the contact's, filled in when it
// is drawn (configs/site-contacts.ts) - the copy in `content` is only a
// fallback for a contact that is gone.
export function contactLine (contact: SiteContact) {
  return {
    ...textWithIcon(),
    icon: CONTACT_ICONS[contact.kind],
    content: Object.fromEntries(siteLocales().map(locale => [locale, contactText(contact, locale)])),
    contact: contact.id,
  }
}
