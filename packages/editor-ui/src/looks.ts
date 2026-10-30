// The editor's looks (colour schemes): every colour, corner, shadow and
// font of its own interface. The values live in looks.json - edited on the
// kit's showcase page (/editor-ui, dev only), which saves them back there -
// and every screen follows: the kit's controls read them as CSS variables
// (--sve-*), and the Vuetify parts of the editor get the colours through its
// theme (vuetifyColors below).
//
// Whoever uses the editor picks one of them from the top bar (SveLookMenu) -
// handy when the editor's colours are too close to the site's own.
//
// Nothing here is about the SITE being edited - its look lives in its own
// palette and stylesheets.
import data from './looks.json'

export type LookColors = {
  // the page behind everything, and the surfaces on it
  'bg': string
  'surface': string
  'surface-muted': string
  'surface-sunken': string
  'border': string
  'border-strong': string
  // text
  'text': string
  'text-muted': string
  'text-subtle': string
  // the action colour
  'primary': string
  'primary-hover': string
  'primary-soft': string
  'on-primary': string
  // states
  'danger': string
  'danger-soft': string
  'success': string
  'warning': string
  'focus': string
  // the top bar
  'topbar-bg': string
  'topbar-text': string
  'topbar-muted': string
  'topbar-border': string
  'topbar-hover': string
  // a block's frame and its settings button while editing a page
  'block-outline': string
  'backdrop': string
}

export type Look = {
  id: string
  name: string
  description: string
  font: FontId
  colors: LookColors
  radius: { sm: number, md: number, lg: number }
  shadow: { sm: string, md: string, lg: string }
  // height of a regular control (buttons, fields) - the look's density
  control: number
  topbarHeight: number
}

// The fonts a look can use. Each is a separate download, fetched only
// when a look that uses it is applied.
export const FONTS = {
  'inter': { name: 'Inter', family: '"Inter Variable", system-ui, sans-serif', load: () => import('@fontsource-variable/inter') },
  'manrope': { name: 'Manrope', family: '"Manrope Variable", system-ui, sans-serif', load: () => import('@fontsource-variable/manrope') },
  'nunito-sans': { name: 'Nunito Sans', family: '"Nunito Sans Variable", system-ui, sans-serif', load: () => import('@fontsource-variable/nunito-sans') },
  'system': { name: 'Системний', family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', load: () => Promise.resolve() },
} satisfies Record<string, { name: string, family: string, load: () => Promise<unknown> }>

export type FontId = keyof typeof FONTS

export type LooksFile = { default: string, looks: Look[] }

export const LOOKS: Look[] = (data as unknown as LooksFile).looks

export const DEFAULT_LOOK: string = (data as unknown as LooksFile).default

export function findLook (id: string | null | undefined): Look {
  return LOOKS.find(look => look.id === id) ?? LOOKS.find(look => look.id === DEFAULT_LOOK) ?? LOOKS[0]!
}

// The look's values as CSS variables.
export function lookVariables (look: Look): Record<string, string> {
  const vars: Record<string, string> = {
    '--sve-font': (FONTS[look.font] ?? FONTS.system).family,
    '--sve-radius-sm': `${look.radius.sm}px`,
    '--sve-radius-md': `${look.radius.md}px`,
    '--sve-radius-lg': `${look.radius.lg}px`,
    '--sve-shadow-sm': look.shadow.sm,
    '--sve-shadow-md': look.shadow.md,
    '--sve-shadow-lg': look.shadow.lg,
    '--sve-control': `${look.control}px`,
    '--sve-topbar-height': `${look.topbarHeight}px`,
  }
  for (const [name, value] of Object.entries(look.colors)) {
    vars[`--sve-${name}`] = value
  }
  return vars
}

// The same colours for the Vuetify parts of the editor (its editorTheme).
export function vuetifyColors (look: Look): Record<string, string> {
  const c = look.colors
  return {
    'background': c.bg,
    'surface': c.surface,
    'surface-variant': c['surface-sunken'],
    'on-surface-variant': c['text-muted'],
    'primary': c.primary,
    'primary-darken-1': c['primary-hover'],
    'secondary': c['text-muted'],
    'secondary-darken-1': c.text,
    'error': c.danger,
    'info': c.primary,
    'success': c.success,
    'warning': c.warning,
  }
}
