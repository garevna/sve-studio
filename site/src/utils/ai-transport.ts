// Asks the site's AI assistant for one thing (global.json -> ai.endpoint).
// The caller knows only this function and the task names - not which model
// answers, nor on whose account. The Pagewright demo points the address at
// its own worker (services/ai-agent); a client's site points it at theirs.
//
// Every call carries the signed-in visitor's ID token: the worker counts its
// daily budget per account and refuses a request without one. So a block
// that offers an AI task must check `auth.user` and offer sign-in first -
// there is nothing to retry after a 401.

export type AiTask = 'translate' | 'rewrite' | 'seo' | 'alt' | 'reply' | 'page' | 'quote'

export interface AiRequest {
  task: AiTask
  text: string
  locale: string
  // translate: the language to produce.
  target?: string
  // rewrite: which way.
  tone?: 'shorter' | 'longer' | 'warmer' | 'formal'
  // Optional: what the site or the page is about.
  context?: string
}

// What came back, or why nothing did. The codes are the worker's own, so a
// block can say the true thing: "come back tomorrow" is not "something went
// wrong".
export type AiFailure
  = | 'not-configured' // the site has no endpoint - the assistant is off
    | 'sign-in' // nobody is signed in, or the token was refused
    | 'daily-limit' // the site's budget for today is spent
    | 'visitor-limit' // this account has had its share of today
    | 'failed' // anything else

export interface AiAnswer {
  ok: boolean
  // The text, or the parsed object for the tasks that answer with JSON.
  result?: unknown
  error?: AiFailure
  // When the budget comes back (ISO), for the two limit failures.
  resetsAt?: string
}

const FAILURES = new Set(['sign-in', 'daily-limit', 'visitor-limit'])

export async function askAi (
  endpoint: string | undefined,
  idToken: string,
  request: AiRequest,
): Promise<AiAnswer> {
  if (!endpoint) {
    return { ok: false, error: 'not-configured' }
  }
  if (!idToken) {
    return { ok: false, error: 'sign-in' }
  }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(request),
    })
    const body = await response.json().catch(() => ({})) as { ok?: boolean, result?: unknown, error?: string, resetsAt?: string }
    if (response.ok && body.ok) {
      return { ok: true, result: body.result }
    }
    const error = FAILURES.has(String(body.error)) ? body.error as AiFailure : 'failed'
    return { ok: false, error, resetsAt: body.resetsAt }
  } catch {
    return { ok: false, error: 'failed' }
  }
}
