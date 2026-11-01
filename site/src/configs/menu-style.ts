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

export interface DropdownStyle {
  radius: string
  background: string
  itemClass: string
  activeClass: string
}

export interface MenuStyleModel {
  dropdown: DropdownStyle
}

// What the menu looked like before it could be changed.
export const DROPDOWN_DEFAULTS: DropdownStyle = {
  radius: 'small-border-radius',
  background: 'light-grey-2',
  itemClass: 'default-text text-medium text-special',
  activeClass: 'default-text text-medium text-primary',
}

function text (value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function resolveMenuStyle (stored?: { dropdown?: Partial<DropdownStyle> } | null): MenuStyleModel {
  const dropdown = stored?.dropdown
  return {
    dropdown: {
      radius: text(dropdown?.radius, DROPDOWN_DEFAULTS.radius),
      background: text(dropdown?.background, DROPDOWN_DEFAULTS.background),
      itemClass: text(dropdown?.itemClass, DROPDOWN_DEFAULTS.itemClass),
      activeClass: text(dropdown?.activeClass, DROPDOWN_DEFAULTS.activeClass),
    },
  }
}

// CSS variables the dropdown's box reads (see the site's main-menu styles).
export function dropdownVars (style: DropdownStyle): Record<string, string> {
  return {
    '--dropdown-radius': style.radius === '0' ? '0' : `var(--${style.radius})`,
    '--dropdown-background': `var(--${style.background})`,
  }
}
