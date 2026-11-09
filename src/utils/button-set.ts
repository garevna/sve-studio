import type { ButtonEntry, ButtonStateStyle } from './button-style-entry'
import { BUTTON_CATALOG, templateOf } from '@/configs/button-catalog'
import { serializeButtonEntries } from './button-style-entry'

// The client's own buttons - their "arsenal": each one a kind from our
// catalogue (configs/button-catalog.ts) in the client's own colours, under
// a name the client chose ("Синя з заливкою"). The class it gets is ours
// and never shown: a page's button stores it, the site's stylesheet styles
// it.
//
// All of it lives in one stylesheet, button-set.css: the list itself as a
// comment at the top, the CSS generated from it below. The editor reads the
// list; the site only applies the CSS. One file means the list and its
// CSS can never disagree, and drafts / undo / publish work as for any
// stylesheet.

export const BUTTON_SET_FILE = 'button-set.css'

export interface SetButton extends ButtonEntry {
  // shown to the client - the class (className) is ours
  name: string
  // a kind from the catalogue
  template: string
  // false: as wide as its text; otherwise as wide as its column
  fullWidth?: boolean
}

const HEADER_RE = /\/\*\s*@button-set\s*([\s\S]*?)\*\//

export function parseButtonSet (cssText: string | null | undefined): SetButton[] | null {
  const match = (cssText || '').match(HEADER_RE)
  if (!match) {
    return null
  }
  try {
    const data = JSON.parse(match[1] as string) as { buttons?: SetButton[] }
    return (data.buttons ?? []).map(button => ({
      ...button,
      base: withRaw(button.base),
      hover: withRaw(button.hover),
      disabled: withRaw(button.disabled),
    }))
  } catch {
    return null
  }
}

function withRaw (state: Partial<ButtonStateStyle> | undefined): ButtonStateStyle {
  return { ...state, raw: state?.raw ?? [] }
}

// The list in the comment: only what the client set (no empty raw lists).
// "*/" inside a name would end the comment - JSON's "\/" keeps it out.
function header (buttons: SetButton[]): string {
  const data = {
    buttons: buttons.map(({ className, name, template, fullWidth, base, hover, disabled }) => ({
      className, name, template, fullWidth, base: bare(base), hover: bare(hover), disabled: bare(disabled),
    })),
  }
  return `/* @button-set\n${JSON.stringify(data, null, 2).replaceAll('*/', String.raw`*\/`)}\n*/`
}

function bare (state: ButtonStateStyle): Partial<ButtonStateStyle> {
  const { raw, ...rest } = state
  return raw.length > 0 ? state : rest
}

// What every button of the set has, whatever its kind - except a bare kind
// (the icon button), which is not a text button and has only its own.
function commonRule (button: SetButton): string {
  const template = templateOf(button.template)
  const declarations = template.bare
    ? (template.own ?? [])
    : [
        'font-family: var(--main-font) !important',
        'font-size: 16px !important',
        'font-weight: 400 !important',
        'text-transform: none !important',
        'letter-spacing: normal !important',
        'box-shadow: none !important',
        'border-radius: var(--default-border-radius) !important',
        'padding: 12px 24px',
        `width: ${button.fullWidth === false ? 'auto' : '100%'}`,
        ...(template.own ?? []),
      ]
  return `.${button.className} {\n${declarations.map(item => `  ${item};`).join('\n')}\n}`
}

export function buttonCss (button: SetButton): string {
  const template = templateOf(button.template)
  const written = template.written ? template.written(button) : button
  return [
    commonRule(button),
    serializeButtonEntries([written], []),
    template.extra?.(button.className, button) ?? '',
  ].filter(Boolean).join('\n\n')
}

// The motion every kind in the list shares (keyframes...), once.
function sharedCss (buttons: SetButton[]): string {
  const seen = new Set<string>()
  for (const button of buttons) {
    const shared = templateOf(button.template).shared
    if (shared) {
      seen.add(shared)
    }
  }
  return [...seen].join('\n\n')
}

// The class a component (the sign-in page, an icon button) gives its
// button to look like the client's button of that kind - the first one of
// it in the set, or the kind's own starting look while the set has none.
export function kindClass (templateId: string): string {
  return `button-kind-${templateId}`
}

function kindsCss (buttons: SetButton[]): string {
  return BUTTON_CATALOG
    .filter(template => template.component)
    .map(template => {
      const own = buttons.find(button => button.template === template.id) ?? newSetButton(template.id, '', [])
      return buttonCss({ ...own, className: kindClass(template.id) })
    })
    .join('\n\n')
}

export function buttonSetCss (buttons: SetButton[]): string {
  return [sharedCss(buttons), ...buttons.map(button => buttonCss(button)), kindsCss(buttons)].filter(Boolean).join('\n\n')
}

export function buttonSetFile (buttons: SetButton[]): string {
  return `${header(buttons)}\n\n${buttonSetCss(buttons)}\n`
}

// A new button of a kind, in that kind's starting colours.
export function newSetButton (templateId: string, name: string, taken: string[]): SetButton {
  const template = templateOf(templateId)
  const look = template.look
  return {
    className: uniqueClass(taken),
    name,
    template: template.id,
    base: { ...structuredClone(look.base), raw: [] },
    hover: { ...structuredClone(look.hover ?? {}), raw: [] },
    disabled: { ...structuredClone(look.disabled ?? {}), raw: [] },
  }
}

// A sample of every kind, for the catalogue in the UI Kit.
export function catalogSampleClass (templateId: string): string {
  return `button-sample-${templateId}`
}

function uniqueClass (taken: string[]): string {
  for (;;) {
    const name = `button-${Math.random().toString(36).slice(2, 7)}`
    if (!taken.includes(name)) {
      return name
    }
  }
}
