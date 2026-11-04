// Which inbox the "Повідомлення" section works with, by the site's own
// settings (global.json): the sign-in (auth) and the feedback service
// (feedback.endpoint). Only the demo's own is known so far; a client's API
// is one more branch here. null - not set up: the section says so.
import type { InboxAdapter } from './types'
import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
import { pagewrightInbox } from './pagewright'

export function inboxFor (settings: Pick<GlobalSettingsModel, 'auth' | 'feedback'> | null): InboxAdapter | null {
  const endpoint = settings?.feedback?.endpoint
  const auth = settings?.auth
  if (endpoint && auth?.provider === 'firebase' && auth.firebase?.apiKey) {
    return pagewrightInbox(auth.firebase, endpoint)
  }
  return null
}

export * from './types'
