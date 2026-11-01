import type { SiteContact } from '@/configs/site-contacts'
import { shallowRef } from 'vue'
import { contactOf, contactText } from '@/configs/site-contacts'
import { useAjaxStore } from '@/stores/ajax'

// The site's contacts (global.json contacts) for every editor surface that
// shows a contact line - loaded once, and updated by the general settings
// page as they are edited, so a changed number shows everywhere at once.
const contacts = shallowRef<SiteContact[]>([])
let loading: Promise<void> | null = null

export function setSiteContacts (list: SiteContact[] | undefined) {
  contacts.value = Array.isArray(list) ? [...list] : []
}

export function useSiteContacts () {
  if (!loading) {
    loading = useAjaxStore().getGlobalSettings().then(settings => setSiteContacts(settings?.contacts)).catch(() => {
      loading = null
    })
  }
  // The text a contact line shows in this language, or null for a line that
  // is not a contact.
  function lineText (id: string | undefined, locale: string): string | null {
    const contact = contactOf(id, contacts.value)
    return id ? (contact ? contactText(contact, locale) : '') : null
  }
  return { contacts, lineText }
}
