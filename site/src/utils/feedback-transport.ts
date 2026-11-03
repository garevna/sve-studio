// Sends a filled-in feedback form to wherever the site says
// (global.json -> feedback.endpoint). The form knows only this function and
// the payload below - not who is on the other end. The Pagewright demo
// points the address at its own Telegram relay (services/feedback-telegram);
// a client's site points it at its own API, or replaces this one module.

export interface FeedbackPayload {
  kind: string
  locale: string
  page: string
  fields: {
    name?: string
    phone?: string
    email?: string
    date?: string
    rating?: number
    message?: string
  }
  // Left empty by people; bots fill every field they find.
  website?: string
}

export type FeedbackResult = 'sent' | 'not-configured' | 'failed'

export async function sendFeedback (endpoint: string | undefined, payload: FeedbackPayload): Promise<FeedbackResult> {
  if (!endpoint) {
    return 'not-configured'
  }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({})) as { ok?: boolean, error?: string }
    if (body.error === 'not-configured') {
      return 'not-configured'
    }
    return response.ok && body.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
