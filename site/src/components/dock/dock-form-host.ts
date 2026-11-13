import type { Dock, DockContext, DockField, DockFieldLook, DockOption } from '@sve/dock'
import type { InjectionKey } from 'vue'
import type { calendarProps } from '@/configs/popup-looks'
import { inject } from 'vue'

// What a docking form's fields (DockForm*.vue) work against: the values,
// the docking block, the calendar's look, where the visitor goes on. The
// site gives its own (the visitor's values, kept for the tab), the editor
// its own (values of its own, a new tab instead of leaving).
//
// NOTE: the editor's copy is src/components/dock/dock-form-host.ts - keep
// the two identical.
export interface DockFormHost {
  // the form's values by key (reactive)
  values: Record<string, unknown>
  set: (key: string, value: unknown) => void
  dock: Dock
  context: (values: Record<string, unknown>, month?: string) => DockContext
  lang: () => string
  calendarLook: (id?: string) => ReturnType<typeof calendarProps>
  // a look of the UI Kit's "Елементи форми"; absent id - the first
  fieldLook: (id?: string) => DockFieldLook
  report: (what: string, error: unknown) => void
  // on to the client's own system
  go: (url: string) => void
  // a form's values, as one message, to the site's own channel (global.json
  // feedback.endpoint) - the button's "channel" action
  send: (message: string) => Promise<'sent' | 'not-configured' | 'failed'>
  // the editor's overlays (menus) wear the site's look
  overlayClass?: string
  overlayTheme?: string
  // the editor while a block is being edited: cards are shown before what
  // they depend on is chosen, for sample values
  editing?: () => boolean
}

// What the form adds for its fields: the lists they loaded (a sample
// takes the first one) and the captions of the others.
export interface DockFormScope extends DockFormHost {
  lists: Record<string, DockOption[]>
  labelOf: (key: string) => string
  fieldOf: (key: string) => DockField | undefined
  // the fields a request still waits for (but the asking field itself)
  waitingFor: (request: string | undefined, own: string) => string[]
  // values to show cards with before the visitor has chosen (editing only)
  sampleFor: (keys: string[]) => Record<string, unknown> | null
  // the form's calendar model (UI Kit)
  calendar: () => string | undefined
  // a field's look: its own, else the form's
  lookOf: (field: DockField) => DockFieldLook
}

export const DOCK_FORM_HOST: InjectionKey<DockFormHost> = Symbol('dock-form-host')
export const DOCK_FORM_SCOPE: InjectionKey<DockFormScope> = Symbol('dock-form-scope')

export function useDockFormScope (): DockFormScope {
  const scope = inject(DOCK_FORM_SCOPE, null)
  if (!scope) {
    throw new Error('A docking form field outside DockFormView')
  }
  return scope
}

export function isoOf (value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
