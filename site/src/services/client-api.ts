// The client's own API, as far as the site talks to it: where a visitor's
// answers go (a popup's answer for now; later anything a block collects).
// The site knows only this module and the shapes below. Which endpoints
// there are comes from global.json `clientApi`, written in the editor;
// docs/client-api.md is the whole contract.
//
// A site without a client API (or a popup that names no endpoint) sends
// nothing: the answer still reaches whatever on the page asked for it.

export interface ClientApiEndpoint {
  // what a popup names in `deliver`
  id: string
  // the client's own name for it, in the editor only
  name?: string
  // absolute, or relative to `baseUrl`
  url: string
  method?: 'POST' | 'PUT'
}

export interface ClientApiSettings {
  baseUrl?: string
  endpoints?: ClientApiEndpoint[]
}

// One answer of one visitor.
export interface VisitorAnswer {
  // where it came from: 'popup'
  source: 'popup'
  // the popup's id and the client's name for it
  id: string
  name: string
  // its kind (configs/popup-kinds.ts) - says what `value` is
  kind: string
  value: unknown
  locale: string
  page: string
  // ISO time, the visitor's clock
  at: string
}

export type DeliveryResult = 'sent' | 'no-endpoint' | 'failed'

let settings: ClientApiSettings = {}

export function setClientApi (value: ClientApiSettings | undefined) {
  settings = value ?? {}
}

function endpointUrl (endpoint: ClientApiEndpoint): string {
  if (/^https?:\/\//.test(endpoint.url) || !settings.baseUrl) {
    return endpoint.url
  }
  return `${settings.baseUrl.replace(/\/+$/, '')}/${endpoint.url.replace(/^\/+/, '')}`
}

export async function deliverAnswer (endpointId: string | undefined, answer: VisitorAnswer): Promise<DeliveryResult> {
  const endpoint = endpointId ? settings.endpoints?.find(item => item.id === endpointId) : undefined
  if (!endpoint?.url) {
    return 'no-endpoint'
  }
  try {
    const response = await fetch(endpointUrl(endpoint), {
      method: endpoint.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answer),
    })
    return response.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
