// A form of the site ("Форми"): the fields a visitor fills in and what its
// button does - kept in content/settings/forms.json, the site's one list of
// forms. A form is made once and shown anywhere: a block on a page names it,
// so will a popup. Its fields may read lists and days from the client's API
// (client-api.json's requests).
//
// Who sets what (the editor's "Форми"):
//   the look (designer)    - which fields, in what order, their icons,
//                            captions, words, the layout, the calendar;
//   the action (devops)    - where the button sends: the site's own channel,
//                            or the client's API - then each field's key (the
//                            name the API knows it by) and the requests it
//                            reads from / the button sends to.
// A preset ("Бронювання", "Запис", "Магазин", "Заявка") is only where a new
// form starts: after that every field is the form's own.

// A text in the site's languages: { uk, en, de }.
export type DockText = Partial<Record<string, string>>

interface DockFieldBase {
  // the field's key - what the requests read ({ from: 'field', key })
  key: string
  label?: DockText
  icon?: string
  // the button waits until it is filled in
  required?: boolean
  // a look of the UI Kit's "Елементи форми" of its own; absent - the form's
  look?: string
}

// One value out of a list from the client's API (a city, a service, a
// product), typed into or picked.
export interface DockChoiceField extends DockFieldBase {
  kind: 'choice'
  request?: string
  placeholder?: DockText
}

// A day or a stretch of days; the client's API can mark which are free and
// put a line (a price) under each.
export interface DockDatesField extends DockFieldBase {
  kind: 'dates'
  request?: string
  // two days, from - to (a stay), or one (an appointment)
  range?: boolean
  // the word after the count of nights: "ніч|ночі|ночей"
  units?: DockText
}

// Numbers stepped with - and + (guests, rooms, pieces), each its own key.
export interface DockCounter {
  key: string
  label?: DockText
  min: number
  max: number
  start: number
  // the word after the number in the field's line: "дорослий|дорослі|дорослих"
  units?: DockText
}
export interface DockCountersField extends DockFieldBase {
  kind: 'counters'
  items: DockCounter[]
}

// One of the client's items as cards (a room, a master, a variant): a
// picture, points and a line - shown once what it depends on is chosen.
export interface DockCardsField extends DockFieldBase {
  kind: 'cards'
  request?: string
  // after the card's line: "за ніч"
  suffix?: DockText
  // when the client has nothing to offer
  empty?: DockText
}

// Something typed: a name, a phone, an e-mail, a message.
export interface DockTextField extends DockFieldBase {
  kind: 'text'
  input?: 'text' | 'email' | 'tel' | 'textarea'
  placeholder?: DockText
}

export type DockField = DockChoiceField | DockDatesField | DockCountersField | DockCardsField | DockTextField
export type DockFieldKind = DockField['kind']

export type DockPreset = 'booking' | 'appointment' | 'shop' | 'enquiry'

export interface DockForm {
  id: string
  // the form's name in the editor
  name: string
  preset?: DockPreset
  // bar - in one row, like a search (cards and long texts below it);
  // stack - one field under another, like an application form
  layout?: 'bar' | 'stack'
  // a calendar model of the UI Kit; absent - the first one
  calendar?: string
  // how its elements look (UI Kit "Елементи форми", field-looks.ts);
  // absent - the first look
  look?: string
  fields: DockField[]
  button: {
    label?: DockText
    // channel - the values go as one message to the site's own channel
    //           (global.json feedback.endpoint), like a popup's form;
    // api     - to the client's API: `request` below.
    // Absent: api when a request is named, else channel.
    action?: DockFormAction
    // a handoff (the visitor goes on to the client's own system) or an
    // answer (the values are sent, the visitor stays)
    request?: string
    // said after the values were taken
    done?: DockText
  }
}

export type DockFormAction = 'channel' | 'api'

// What the form's button does.
export function formAction (form: DockForm): DockFormAction {
  return form.button.action ?? (form.button.request ? 'api' : 'channel')
}

// content/settings/forms.json
export interface FormsDocument {
  forms: DockForm[]
}

export function textOf (text: DockText | undefined, lang: string, fallback = ''): string {
  return text?.[lang] || fallback
}

// "2 дорослі", "5 ночей", "1 adult": the word after a number, out of
// "one|few|many" (Ukrainian) or "one|many" (English, German).
export function countedText (units: DockText | undefined, lang: string, count: number): string {
  const forms = textOf(units, lang).split('|').map(item => item.trim()).filter(Boolean)
  if (forms.length === 0) {
    return String(count)
  }
  const word = (index: number) => `${count} ${forms[Math.min(index, forms.length - 1)]}`
  if (lang !== 'uk') {
    return word(count === 1 ? 0 : 1)
  }
  const tens = count % 100
  const ones = count % 10
  if (tens > 10 && tens < 20) {
    return word(2)
  }
  if (ones === 1) {
    return word(0)
  }
  return word(ones >= 2 && ones <= 4 ? 1 : 2)
}

function hasValue (value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
}

// Has the visitor given this field what it needs?
export function isFilled (field: DockField, values: Record<string, unknown>): boolean {
  switch (field.kind) {
    case 'counters': {
      return true
    }
    case 'dates': {
      const days = values[field.key]
      return Array.isArray(days) && days.length >= (field.range ? 2 : 1)
    }
    default: {
      return hasValue(values[field.key])
    }
  }
}

// A field stays in the row of a "bar" form, or goes under it.
export function inBar (field: DockField, form: DockForm): boolean {
  return (form.layout ?? 'bar') === 'bar' && field.kind !== 'cards' && !(field.kind === 'text' && field.input === 'textarea')
}

// The keys a form fills in - for the requests' field lists.
export function formKeys (form: DockForm): string[] {
  return form.fields.flatMap(field => field.kind === 'counters' ? field.items.map(item => item.key) : [field.key])
}

// What a "channel" form sends: its name, then "caption: value" a line for
// every field given - the way the channel shows a popup's form. A list's
// value is said by its own words (`said`: a city's name, not its id).
export function formMessage (form: DockForm, values: Record<string, unknown>, lang: string, said: (key: string, value: unknown) => string | undefined = () => undefined): string {
  const lines: string[] = [`«${form.name || form.id}»`]
  // 2026-12-07 -> 07.12.2026
  const day = (value: unknown) => String(value).slice(0, 10).split('-').toReversed().join('.')
  for (const field of form.fields) {
    if (field.kind === 'counters') {
      // as the field's own line says them: a zero that may be zero is left out
      for (const item of field.items) {
        const count = values[item.key]
        if (hasValue(count) && (Number(count) > 0 || item.min > 0)) {
          lines.push(`${textOf(item.label, lang, item.key)}: ${String(count)}`)
        }
      }
      continue
    }
    const value = values[field.key]
    if (!hasValue(value)) {
      continue
    }
    let text: string
    if (field.kind === 'dates' && Array.isArray(value)) {
      // the picker holds every day of a stay: its first and its last
      text = field.range && value.length > 1 ? `${day(value[0])} — ${day(value.at(-1))}` : day(value[0])
    } else {
      text = Array.isArray(value) ? value.map(String).join(', ') : (said(field.key, value) ?? String(value))
    }
    lines.push(`${textOf(field.label, lang, field.key)}: ${text}`)
  }
  return lines.join('\n')
}

// The request a field reads from (choice, dates, cards).
export function fieldRequest (field: DockField): string | undefined {
  return field.kind === 'choice' || field.kind === 'dates' || field.kind === 'cards' ? field.request : undefined
}

// --- presets -------------------------------------------------------------------

const T = (uk: string, en: string, de: string): DockText => ({ uk, en, de })

const GUESTS: DockCountersField = {
  kind: 'counters',
  key: 'guests',
  icon: 'mdi-account-multiple-outline',
  label: T('Гості', 'Guests', 'Gäste'),
  items: [
    { key: 'adults', label: T('Дорослі', 'Adults', 'Erwachsene'), min: 1, max: 12, start: 2, units: T('дорослий|дорослі|дорослих', 'adult|adults', 'Erwachsener|Erwachsene') },
    { key: 'children', label: T('Діти', 'Children', 'Kinder'), min: 0, max: 8, start: 0, units: T('дитина|дитини|дітей', 'child|children', 'Kind|Kinder') },
    { key: 'rooms', label: T('Номери', 'Rooms', 'Zimmer'), min: 1, max: 6, start: 1, units: T('номер|номери|номерів', 'room|rooms', 'Zimmer|Zimmer') },
  ],
}

const NAME: DockTextField = { kind: 'text', key: 'name', input: 'text', icon: 'mdi-account-outline', required: true, label: T('Ім’я', 'Name', 'Name') }
const PHONE: DockTextField = { kind: 'text', key: 'phone', input: 'tel', icon: 'mdi-phone-outline', required: true, label: T('Телефон', 'Phone', 'Telefon'), placeholder: T('+380…', '+44…', '+49…') }
const EMAIL: DockTextField = { kind: 'text', key: 'email', input: 'email', icon: 'mdi-email-outline', label: T('Пошта', 'E-mail', 'E-Mail') }

const PRESETS: Record<DockPreset, () => Omit<DockForm, 'id' | 'name'>> = {
  booking: () => ({
    layout: 'bar',
    fields: [
      { kind: 'choice', key: 'destination', icon: 'mdi-map-marker-outline', required: true, label: T('Куди', 'Where to', 'Wohin'), placeholder: T('Оберіть місто', 'Choose a city', 'Stadt wählen') },
      { kind: 'dates', key: 'dates', icon: 'mdi-calendar-range', required: true, range: true, label: T('Заїзд — виїзд', 'Check-in — check-out', 'Anreise — Abreise'), units: T('ніч|ночі|ночей', 'night|nights', 'Nacht|Nächte') },
      structuredClone(GUESTS),
      { kind: 'cards', key: 'room', icon: 'mdi-bed-outline', label: T('Оберіть номер', 'Choose a room', 'Zimmer wählen'), suffix: T('за ніч', 'a night', 'pro Nacht'), empty: T('На ці дати для такої кількості гостей вільних номерів немає. Спробуйте інші дати.', 'No rooms are free for these dates and guests. Try other dates.', 'Für diese Daten und Gäste sind keine Zimmer frei. Versuchen Sie andere Daten.') },
    ],
    button: { label: T('Знайти', 'Search', 'Suchen') },
  }),
  appointment: () => ({
    layout: 'stack',
    fields: [
      { kind: 'choice', key: 'service', icon: 'mdi-format-list-checks', required: true, label: T('Послуга', 'Service', 'Leistung'), placeholder: T('Оберіть послугу', 'Choose a service', 'Leistung wählen') },
      { kind: 'cards', key: 'master', icon: 'mdi-account-tie-outline', label: T('Майстер', 'Specialist', 'Fachkraft'), empty: T('На цю послугу зараз немає вільних майстрів.', 'No specialist is free for this service now.', 'Für diese Leistung ist gerade niemand frei.') },
      { kind: 'dates', key: 'day', icon: 'mdi-calendar', required: true, range: false, label: T('День', 'Day', 'Tag') },
      structuredClone(NAME),
      structuredClone(PHONE),
    ],
    button: { label: T('Записатися', 'Book', 'Termin buchen'), done: T('Дякуємо! Ми підтвердимо запис.', 'Thank you! We will confirm the booking.', 'Danke! Wir bestätigen den Termin.') },
  }),
  shop: () => ({
    layout: 'stack',
    fields: [
      { kind: 'cards', key: 'variant', icon: 'mdi-tag-outline', required: true, label: T('Варіант', 'Option', 'Variante'), empty: T('Цього товару зараз немає.', 'Out of stock for now.', 'Derzeit nicht vorrätig.') },
      { kind: 'counters', key: 'amount', icon: 'mdi-counter', label: T('Кількість', 'Quantity', 'Menge'), items: [{ key: 'quantity', label: T('Кількість', 'Quantity', 'Menge'), min: 1, max: 20, start: 1, units: T('шт.', 'pc|pcs', 'Stk.|Stk.') }] },
    ],
    button: { label: T('До кошика', 'Add to cart', 'In den Warenkorb') },
  }),
  enquiry: () => ({
    layout: 'stack',
    fields: [
      structuredClone(NAME),
      structuredClone(PHONE),
      structuredClone(EMAIL),
      { kind: 'text', key: 'message', input: 'textarea', icon: 'mdi-message-text-outline', label: T('Що вас цікавить', 'Your question', 'Ihre Frage') },
    ],
    button: { label: T('Надіслати', 'Send', 'Senden'), done: T('Дякуємо! Ми відповімо найближчим часом.', 'Thank you! We will answer shortly.', 'Danke! Wir antworten in Kürze.') },
  }),
}

export const DOCK_PRESETS: DockPreset[] = ['booking', 'appointment', 'shop', 'enquiry']

export function presetForm (preset: DockPreset, id: string, name: string): DockForm {
  return { id, name, preset, ...PRESETS[preset]() }
}

// A new field of a kind, as the "Вигляд" tab adds it.
export function blankField (kind: DockFieldKind, key: string): DockField {
  switch (kind) {
    case 'choice': {
      return { kind, key, icon: 'mdi-format-list-bulleted', label: {}, placeholder: {} }
    }
    case 'dates': {
      return { kind, key, icon: 'mdi-calendar', range: false, label: {} }
    }
    case 'counters': {
      return { kind, key, icon: 'mdi-counter', label: {}, items: [{ key: `${key}-count`, label: {}, min: 0, max: 10, start: 1, units: {} }] }
    }
    case 'cards': {
      return { kind, key, icon: 'mdi-view-grid-outline', label: {} }
    }
    case 'text': {
      return { kind, key, icon: 'mdi-form-textbox', input: 'text', label: {} }
    }
  }
}
