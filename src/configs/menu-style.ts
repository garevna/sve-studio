import type { SocialIconLook } from './social-icons'
import { FEEDBACK_POPUP_ID } from './default-popups'

// The look of the site's menus, set in the UI Kit ("Меню") and kept in
// global.json `menuStyle`. Same file in site/src/configs - keep the two
// identical.
//
// dropdown - the list that drops out of a menu bar entry (and of the
//            language switcher):
//   radius      - a palette radius key ('0' for square corners);
//   background  - a palette colour key;
//   itemClass   - text classes of an entry (size, weight, colour, font -
//                 the editor's usual text format);
//   activeClass - the same for the entry of the page being shown.
//
// mobile - the menu a phone opens from the burger button: a panel built of
//          rows the designer puts in order (logo, languages, the menu, ...),
//          each with its own background - so a coloured head or foot is a
//          row with a fill, not a separate setting.

export interface DropdownStyle {
  radius: string
  background: string
  itemClass: string
  activeClass: string
}

// Where the panel comes from: up from the bottom, over the whole screen,
// or from a side.
export type MobilePlacement = 'bottom' | 'full' | 'left' | 'right'
export type MobileRowType = 'logo' | 'locales' | 'menu' | 'social' | 'contact' | 'user' | 'divider' | 'spacer'
export type RowAlign = 'start' | 'center' | 'end'
export type Translated = Record<string, string>

export interface MobileMenuRow {
  type: MobileRowType
  // A palette key filling the row edge to edge ('' - none).
  background?: string
  align?: RowAlign
  // logo: the light version (global.json logoWhite), for a dark fill.
  lightLogo?: boolean
  // locales: buttons in a row, or the dropdown; with the "Мова" label.
  localeLook?: 'chips' | 'dropdown'
  localeLabel?: boolean
  // social: the icons' look, colour of a one-colour look, size.
  iconLook?: SocialIconLook
  iconColor?: string
  iconSize?: number
  // contact: a button that opens the feedback form.
  buttonClass?: string
  label?: Translated
  // contact: the site popup it opens (content/settings/popups.json); a row
  // from before popups carries its own form texts instead
  popup?: string
  form?: { type?: string, title?: Translated, text?: Translated }
  // divider: its colour.
  color?: string
}

export interface MobileMenuStyle {
  placement: MobilePlacement
  radius: string
  background: string
  // Width of a side panel, px.
  width: number
  // Text formats: a menu entry, the entry of the open page, a sub-entry,
  // the user's name. The language buttons use the first two.
  itemClass: string
  activeClass: string
  subItemClass: string
  userNameClass: string
  rows: MobileMenuRow[]
}

export interface MenuStyleModel {
  dropdown: DropdownStyle
  mobile: MobileMenuStyle
}

// What the menu looked like before it could be changed.
export const DROPDOWN_DEFAULTS: DropdownStyle = {
  radius: 'small-border-radius',
  background: 'light-grey-2',
  itemClass: 'default-text text-medium text-special',
  activeClass: 'default-text text-medium text-primary',
}

export const LOCALE_LABEL: Translated = { uk: 'Мова', en: 'Language', de: 'Sprache' }
export const CONTACT_LABEL: Translated = { uk: 'Зв’язатися', en: 'Contact us', de: 'Kontakt' }

export function mobileRow (type: MobileRowType): MobileMenuRow {
  switch (type) {
    case 'logo': {
      return { type, align: 'center' }
    }
    case 'locales': {
      return { type, align: 'center', localeLook: 'chips', localeLabel: false }
    }
    case 'social': {
      return { type, align: 'center', iconLook: 'color', iconColor: 'grey', iconSize: 32 }
    }
    case 'contact': {
      return { type, align: 'center', buttonClass: 'primary-button', label: { ...CONTACT_LABEL }, popup: FEEDBACK_POPUP_ID }
    }
    case 'divider': {
      return { type, color: 'light-grey-1' }
    }
    default: {
      return { type }
    }
  }
}

// Ready starting points; whatever is picked can be changed row by row.
export const MOBILE_PRESETS = ['current', 'brand', 'coloredFoot', 'side'] as const
export type MobilePreset = typeof MOBILE_PRESETS[number]

const TEXT_FORMATS = {
  itemClass: 'default-text text-medium text-black',
  activeClass: 'default-text text-medium text-primary',
  subItemClass: 'default-text text-thin text-black',
  userNameClass: 'default-text text-medium text-black',
}

export function mobilePreset (preset: MobilePreset): MobileMenuStyle {
  const base = { radius: 'default-border-radius', background: 'white', width: 320, ...TEXT_FORMATS }
  switch (preset) {
    case 'brand': {
      return {
        ...base,
        placement: 'full',
        rows: [mobileRow('logo'), mobileRow('divider'), mobileRow('locales'), mobileRow('divider'), mobileRow('menu'), mobileRow('spacer'), mobileRow('divider'), mobileRow('user')],
      }
    }
    case 'coloredFoot': {
      return {
        ...base,
        placement: 'full',
        userNameClass: 'default-text text-medium text-white',
        rows: [mobileRow('logo'), mobileRow('divider'), mobileRow('locales'), mobileRow('divider'), mobileRow('menu'), mobileRow('spacer'), { ...mobileRow('social'), background: 'primary', iconLook: 'mono', iconColor: 'white' }, { ...mobileRow('user'), background: 'primary' }],
      }
    }
    case 'side': {
      return {
        ...base,
        placement: 'right',
        rows: [{ ...mobileRow('logo'), align: 'start' }, mobileRow('divider'), mobileRow('menu'), mobileRow('spacer'), mobileRow('contact'), mobileRow('social'), mobileRow('locales')],
      }
    }
    default: {
      // The menu as it was: over the whole screen, the menu on top and the
      // language dropdown with its label at the bottom.
      return {
        ...base,
        placement: 'full',
        rows: [mobileRow('menu'), mobileRow('spacer'), { type: 'locales', align: 'end', localeLook: 'dropdown', localeLabel: true }],
      }
    }
  }
}

function text (value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

const PLACEMENTS = new Set<string>(['bottom', 'full', 'left', 'right'])
const ROW_TYPES = new Set<string>(['logo', 'locales', 'menu', 'social', 'contact', 'user', 'divider', 'spacer'])

export function resolveMobileStyle (stored?: Partial<MobileMenuStyle> | null): MobileMenuStyle {
  const base = mobilePreset('current')
  if (!stored) {
    return base
  }
  return {
    placement: PLACEMENTS.has(stored.placement as string) ? stored.placement as MobilePlacement : base.placement,
    radius: text(stored.radius, base.radius),
    background: text(stored.background, base.background),
    width: typeof stored.width === 'number' && stored.width > 0 ? stored.width : base.width,
    itemClass: text(stored.itemClass, base.itemClass),
    activeClass: text(stored.activeClass, base.activeClass),
    subItemClass: text(stored.subItemClass, base.subItemClass),
    userNameClass: text(stored.userNameClass, base.userNameClass),
    rows: Array.isArray(stored.rows) ? stored.rows.filter(row => ROW_TYPES.has(row?.type)) : base.rows,
  }
}

export function resolveMenuStyle (stored?: { dropdown?: Partial<DropdownStyle>, mobile?: Partial<MobileMenuStyle> } | null): MenuStyleModel {
  const dropdown = stored?.dropdown
  return {
    dropdown: {
      radius: text(dropdown?.radius, DROPDOWN_DEFAULTS.radius),
      background: text(dropdown?.background, DROPDOWN_DEFAULTS.background),
      itemClass: text(dropdown?.itemClass, DROPDOWN_DEFAULTS.itemClass),
      activeClass: text(dropdown?.activeClass, DROPDOWN_DEFAULTS.activeClass),
    },
    mobile: resolveMobileStyle(stored?.mobile),
  }
}

function radiusValue (key: string): string {
  return key === '0' ? '0' : `var(--${key})`
}

// CSS variables the dropdown's box reads (see the site's main-menu styles).
export function dropdownVars (style: DropdownStyle): Record<string, string> {
  return {
    '--dropdown-radius': radiusValue(style.radius),
    '--dropdown-background': `var(--${style.background})`,
  }
}

// The mobile panel's box: its fill, and the corners that face the page -
// the top ones for a panel from the bottom (and over the whole screen, as
// the menu always had), the inner ones for a side panel.
export function mobilePanelStyle (style: MobileMenuStyle): Record<string, string> {
  const radius = radiusValue(style.radius)
  const corners: Record<MobilePlacement, string> = {
    bottom: `${radius} ${radius} 0 0`,
    full: `${radius} ${radius} 0 0`,
    left: `0 ${radius} ${radius} 0`,
    right: `${radius} 0 0 ${radius}`,
  }
  return {
    'background': `var(--${style.background})`,
    'border-radius': corners[style.placement],
    '--mobile-menu-width': `${style.width}px`,
  }
}

export function rowStyle (row: MobileMenuRow): Record<string, string> {
  const style: Record<string, string> = {}
  if (row.background) {
    style.background = `var(--${row.background})`
  }
  if (row.align) {
    style['--row-align'] = row.align === 'start' ? 'flex-start' : (row.align === 'end' ? 'flex-end' : 'center')
  }
  return style
}

export function translated (value: Translated | undefined, locale: string): string {
  return value?.[locale] || value?.uk || Object.values(value ?? {}).find(Boolean) || ''
}

// The feedback popup every site starts with (configs/default-popups.ts).

export { FEEDBACK_POPUP_ID } from './default-popups'
