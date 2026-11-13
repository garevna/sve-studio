import type { DockForm } from './form'

// The docking block's settings: content/settings/client-api.json.
//
// Everything about one client's API lives here - addresses, which value
// goes where under which name, formats, how the visitor is handed over to
// the client's own booking engine or checkout. The site's forms know only
// the keys of their own fields ("destination", "dates", "adults"...); a new
// client means new settings, never new site code. docs/client-api.md is the
// whole contract.

// Where one value comes from.
export type DockSource
  // a field of a form on the site, by its key
  = | { from: 'field', key: string, pick?: DockPick, format?: DockFormat }
  // something the site knows by itself
    | { from: 'system', value: DockSystemValue, format?: DockFormat }
  // always the same text
    | { from: 'const', value: string }
  // the client's answer to the session request (handoff in 'session' mode)
    | { from: 'response', path: string }

// What a field with several values (a date range, a choice of many) gives.
//   first / last - one of them; all - all of them, comma-separated;
//   count - how many there are (nights = count of a range - 1 is the
//   client's own business, they get the dates).
export type DockPick = 'first' | 'last' | 'all' | 'count'

//   locale - the site's language (uk, en, de);
//   page   - the address of the page the visitor is on;
//   return - the site's home page in that language, absolute: where the
//            client's engine sends the visitor back to;
//   month  - the month a calendar is showing, YYYY-MM (date lookups only);
//   now    - the visitor's time, ISO.
export type DockSystemValue = 'locale' | 'page' | 'return' | 'month' | 'now'

// How a value is written out. Dates are kept as YYYY-MM-DD; everything else
// as the field gave it.
export type DockFormat = 'as-is' | 'YYYY-MM-DD' | 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'number' | 'text'

// One named value of a request: a query parameter, or a field of the body
// ("guests.adults" - a dot nests it).
export interface DockParam {
  name: string
  source: DockSource
}

// Where a request goes and what it carries. `url` is absolute, or relative
// to the document's `baseUrl` (or, without one, to the site's own root -
// the demo's test API lives there).
export interface DockCall {
  url: string
  method?: 'GET' | 'POST' | 'PUT'
  query?: DockParam[]
  body?: DockParam[]
}

interface DockRequestBase {
  id: string
  // the client's own name for it, shown in the editor only
  name: string
}

// A list a field chooses from: destinations, hotels, categories.
//   path  - where in the answer the list is ("data.items"); empty = the
//           answer is the list;
//   value - the item's field that goes back to the client (its id);
//   label - what the visitor sees: a template over the item's fields,
//           "{name}, {country}";
// and, for a choice shown as cards (a room, a service, a tariff):
//   image   - the item's field with a picture's address (relative ones are
//             taken against the document's baseUrl);
//   details - the item's field with its points: a list, or one line;
//   hint    - a line under it, a template: "{perNight} {currency}".
export interface DockOptionsRequest extends DockRequestBase {
  role: 'options'
  call: DockCall
  list: { path?: string, value: string, label: string, image?: string, details?: string, hint?: string }
}

// The days a calendar offers, asked again when the fields it depends on or
// the month shown change.
//   date - the item's field holding the day, YYYY-MM-DD;
//   hint - a line under the day: "{price} {currency}"; empty = none.
export interface DockDatesRequest extends DockRequestBase {
  role: 'dates'
  call: DockCall
  result: { path?: string, date: string, hint?: string }
}

// The visitor goes on to the client's own engine (search results, booking,
// checkout) - which is the client's, not ours.
//   link    - straight to `target`, the values in its address;
//   session - `session` is sent first, then `target` - whose address and
//             parameters can take values from the answer
//             ({ from: 'response', path: 'token' }, or "{token}" in the url).
export interface DockHandoffRequest extends DockRequestBase {
  role: 'handoff'
  mode: 'link' | 'session'
  session?: DockCall
  target: { url: string, query?: DockParam[] }
}

// A popup's answer, posted as it is (the VisitorAnswer shape).
export interface DockAnswerRequest extends DockRequestBase {
  role: 'answer'
  call: DockCall
}

export type DockRequest = DockOptionsRequest | DockDatesRequest | DockHandoffRequest | DockAnswerRequest
export type DockRole = DockRequest['role']

export interface ClientApiDocument {
  baseUrl?: string
  requests: DockRequest[]
  // The site's forms (form.ts), stored in forms.json since they became the
  // site's own (not only the API's): the docking block is given them here,
  // in memory, to know which fields a request reads. A client-api.json from
  // before that still carries them - read once into forms.json.
  forms?: DockForm[]
}

// What a request is built from at the moment it is sent.
export interface DockContext {
  // the forms' values, by field key
  values: Record<string, unknown>
  system: {
    locale: string
    page: string
    return: string
    month?: string
  }
  // the session request's answer (handoff, 'session' mode)
  response?: unknown
}

// A request as it will go out - what the editor shows and the site sends.
export interface DockOutgoing {
  url: string
  method: 'GET' | 'POST' | 'PUT'
  body?: Record<string, unknown>
}

export interface DockOption {
  value: string
  label: string
  image?: string
  details?: string[]
  hint?: string
}

export interface DockDay {
  date: string
  hint?: string
}
