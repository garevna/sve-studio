// How a docking form's elements look - the client's set in the UI Kit
// ("Елементи форми"), kept in popups.json `fieldLooks` next to the popups'
// looks and calendars. A form (and, if it wants, a single field) names one
// by its id; absent - the first.
//
// Every element has two states:
//   closed - the field as it sits in the form before it is opened: a grey
//            plate, a frame, a line, a pill, a tile with the icon on top;
//   opened - what opens from it (the calendar, the counters): a panel
//            under the field, a window over the page, a sheet from the
//            bottom of a phone's screen, or right inside the form.
// Colours are palette keys (var(--key)), corners the theme's radii.

export type DockClosedVariant = 'filled' | 'outlined' | 'underlined' | 'pill' | 'tile'
export type DockOpenedVariant = 'dropdown' | 'dialog' | 'sheet' | 'inline'

export interface DockFieldLook {
  id: string
  name: string
  closed: {
    variant: DockClosedVariant
    // the caption: a small line over the value, or none (the icon says it)
    label: 'above' | 'hidden'
    icon: 'left' | 'top' | 'none'
    background?: string
    border?: string
    radius?: string
  }
  opened: {
    variant: DockOpenedVariant
    background?: string
    radius?: string
    shadow: boolean
    // the − / + buttons of counters
    stepper: 'outlined' | 'filled' | 'text'
    // a "Готово" button closes the panel
    done: boolean
  }
}

export const DOCK_CLOSED_VARIANTS: DockClosedVariant[] = ['filled', 'outlined', 'underlined', 'pill', 'tile']
export const DOCK_OPENED_VARIANTS: DockOpenedVariant[] = ['dropdown', 'dialog', 'sheet', 'inline']

export const DEFAULT_FIELD_LOOK_ID = 'plates'

// Our starting set - a client takes them and makes them their own.
export const DOCK_FIELD_LOOK_PRESETS: DockFieldLook[] = [
  {
    id: 'plates',
    name: 'Сірі плашки',
    closed: { variant: 'filled', label: 'above', icon: 'left', background: 'light-grey-2', radius: 'extra-small-border-radius' },
    opened: { variant: 'dropdown', background: 'white', radius: 'extra-small-border-radius', shadow: true, stepper: 'outlined', done: false },
  },
  {
    id: 'frames',
    name: 'Рамки',
    closed: { variant: 'outlined', label: 'above', icon: 'left', background: 'white', border: 'grey', radius: 'extra-small-border-radius' },
    opened: { variant: 'dropdown', background: 'white', radius: 'extra-small-border-radius', shadow: true, stepper: 'outlined', done: true },
  },
  {
    id: 'pills',
    name: 'Пігулки',
    closed: { variant: 'pill', label: 'hidden', icon: 'left', background: 'light-grey-2', radius: 'super-border-radius' },
    opened: { variant: 'dialog', background: 'white', radius: 'large-border-radius', shadow: true, stepper: 'filled', done: true },
  },
  {
    id: 'lines',
    name: 'Лінії',
    closed: { variant: 'underlined', label: 'above', icon: 'none', border: 'dark-grey' },
    opened: { variant: 'inline', background: 'white', shadow: false, stepper: 'text', done: false },
  },
  {
    id: 'tiles',
    name: 'Плитки',
    closed: { variant: 'tile', label: 'above', icon: 'top', background: 'light-grey-2', radius: 'extra-small-border-radius' },
    opened: { variant: 'sheet', background: 'white', radius: 'large-border-radius', shadow: true, stepper: 'filled', done: true },
  },
]

export function newFieldLook (preset: string, id: string, name: string): DockFieldLook {
  const base = DOCK_FIELD_LOOK_PRESETS.find(item => item.id === preset) ?? DOCK_FIELD_LOOK_PRESETS[0]!
  return { ...structuredClone(base), id, name }
}

// The client's set as read: none yet - the first of ours.
export function withDefaultFieldLooks (looks: DockFieldLook[] | null | undefined): DockFieldLook[] {
  return looks && looks.length > 0 ? looks : [newFieldLook(DEFAULT_FIELD_LOOK_ID, DEFAULT_FIELD_LOOK_ID, 'Сірі плашки')]
}

export function fieldLookOf (looks: DockFieldLook[], id: string | undefined): DockFieldLook {
  return looks.find(look => look.id === id) ?? looks[0] ?? DOCK_FIELD_LOOK_PRESETS[0]!
}

const colour = (key: string | undefined) => (key ? (key === 'transparent' ? 'transparent' : `var(--${key})`) : undefined)
const radius = (key: string | undefined) => (key ? `var(--${key})` : undefined)

// What the closed field wears: classes and the custom properties the
// form's stylesheet reads (DockFormView.vue).
export function closedLook (look: DockFieldLook) {
  const { closed } = look
  return {
    class: [`pw-dock__field--${closed.variant}`, `pw-dock__field--label-${closed.label}`, `pw-dock__field--icon-${closed.icon}`],
    style: {
      '--pw-field-bg': colour(closed.background),
      '--pw-field-border': colour(closed.border),
      '--pw-field-radius': radius(closed.radius),
    },
  }
}

// What the opened panel wears.
export function openedLook (look: DockFieldLook) {
  const { opened } = look
  return {
    class: ['pw-dock__panel', `pw-dock__panel--${opened.variant}`, { 'pw-dock__panel--shadow': opened.shadow }],
    style: {
      '--pw-panel-bg': colour(opened.background),
      '--pw-panel-radius': radius(opened.radius),
    },
  }
}
