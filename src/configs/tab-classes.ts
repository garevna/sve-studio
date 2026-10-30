// The classes in buttons.css that belong to TABS rather than to buttons.
//
// They live in the same stylesheet (a tab is a button underneath), but they
// are not interchangeable with it: a button demonstrates itself alone, while
// a tab only means anything as one of a group where exactly one carries the
// active class. That is why the UI Kit shows them in their own subsection
// with a working strip instead of a row of isolated preview buttons.

// The backing plate behind the tabs - its background and corner radius.
// Not a button at all, which is exactly why it looked out of place in the
// button list.
//
// Two of them, because tabs appear in two places that genuinely look
// different: on the login page they sit on a grey plate, everywhere else
// (dashboard, settings, the wizard's route details) straight on the page.
// The second one exists so that "straight on the page" stays a DECISION -
// transparent today, a shade tomorrow - instead of being the absence of a
// setting.
export const TAB_STRIP_CLASS = {
  auth: 'auth-page-tabs',
  page: 'page-tabs',
} as const

export const TAB_STYLE_CLASS = {
  idle: 'tab-button',
  active: 'tab-button--active',
} as const

// tabs-selected-class was a second name for the active tab: Vuetify's
// <v-tabs selected-class="..."> stamps whatever class it is given onto the
// selected tab, and some components passed this one while others bound
// .tab-button--active by hand - two names, one identical rule, and a
// compound selector in the CSS whose only job was to settle the fight
// between them. Every component now passes tab-button--active to that same
// prop, so the duplicate name is only recognised here to keep it visible in
// the UI Kit until it is deleted from the stylesheet.
export const TAB_LEGACY_ACTIVE_CLASS = 'tabs-selected-class'

const TAB_CLASSES = new Set<string>([
  TAB_STRIP_CLASS.auth,
  TAB_STRIP_CLASS.page,
  TAB_STYLE_CLASS.idle,
  TAB_STYLE_CLASS.active,
  TAB_LEGACY_ACTIVE_CLASS,
])

export function isTabClass (className: string): boolean {
  return TAB_CLASSES.has(className)
}
