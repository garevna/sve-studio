// Card LOOK comes from the UI Kit (content/styles/cards.css): a cards block
// names a style class in `cardStyle`. A block that names none - every block
// written before the UI Kit had cards - uses the style its layout variant
// always had, so existing pages look exactly as before while already
// taking their look from the UI Kit. Same file in site/src/configs.
export const CARD_STYLE_BY_VARIANT: Record<number, string> = {
  1: 'card-elevated',
  2: 'card-outlined',
  3: 'card-pill',
  4: 'card-filled',
}

export function resolveCardStyle (cardStyle: string | undefined, ver: number): string {
  return cardStyle || CARD_STYLE_BY_VARIANT[ver] || ''
}

// UI Kit stylesheets the site always needs, whatever global.json's `styles`
// list says - a list saved before the file existed would otherwise leave
// every card unstyled.
export const UI_KIT_STYLES = ['cards', 'button-set', 'popups']

export function withUiKitStyles (styles: string[]): string[] {
  return [...styles, ...UI_KIT_STYLES.filter(name => !styles.includes(name))]
}

// Stylesheets of the booking wizard (search, seats, luggage, passengers,
// tickets), which this editor does not offer: global.json still lists them,
// but the site does not load them and the editor's style list does not show
// them. The files stay - a carrier's site with the wizard would take a name
// back out of here.
export const WIZARD_STYLES = ['bus-seat-scheme', 'luggage', 'passenger-list', 'route-description', 'search-for-trip', 'tickets-info', 'trip-slider']

// The plain (non-Vuetify) stylesheets the site loads, from global.json's
// `styles`: the UI Kit's always, the wizard's never.
export function siteStyles (styles: string[]): string[] {
  return withUiKitStyles(styles.filter(name => !name.startsWith('vuetify-') && !WIZARD_STYLES.includes(name)))
}
