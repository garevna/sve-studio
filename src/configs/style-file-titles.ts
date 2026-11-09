import { t } from '@/i18n'
// CSS files have no title field of their own (unlike pages, whose title
// lives right in their content) - the file set is fixed by the theme build
// (see docs/api-requirements.md), so a static lookup is enough. Anything
// not listed here (a new file added later, before this map catches up)
// just falls back to showing its own raw name - see StylesListView.vue.
export const STYLE_FILE_TITLES: Record<string, string> = {
  'alert-blocks.css': 'styleFiles.alertBlocksCss',
  'buttons.css': 'common.buttons',
  'button-set.css': 'styleFiles.buttonSetCss',
  'cards.css': 'styleFiles.cardsCss',
  'common.css': 'styleFiles.commonCss',
  'date-picker.css': 'common.datePicker',
  'faq.css': 'styleFiles.faqCss',
  'home.css': 'styleFiles.homeCss',
  'inputs.css': 'styleFiles.inputsCss',
  'locale-and-currency-switcher.css': 'styleFiles.localeAndCurrencySwitcherCss',
  'main-menu.css': 'common.mainMenu',
  'main.css': 'styleFiles.mainCss',
  'parallax.css': 'styleFiles.parallaxCss',
  'popups.css': 'styleFiles.popupsCss',
  'root.css': 'styleFiles.rootCss',
  'search-for-trip.css': 'styleFiles.searchForTripCss',
  'typographics.css': 'styleFiles.typographicsCss',
  'user-dashboard.css': 'styleFiles.userDashboardCss',
  'vuetify-breadcrumbs.css': 'common.breadcrumbs',
  'vuetify-buttons.css': 'styleFiles.vuetifyButtonsCss',
  'vuetify-card.css': 'styleFiles.vuetifyCardCss',
  'vuetify-components.css': 'styleFiles.vuetifyComponentsCss',
  'vuetify-expansion-panel.css': 'styleFiles.vuetifyExpansionPanelCss',
  'vuetify-overlay-content.css': 'styleFiles.vuetifyOverlayContentCss',
  'vuetify-slide-group.css': 'styleFiles.vuetifySlideGroupCss',
  'vuetify-tables.css': 'styleFiles.vuetifyTablesCss',
  'vuetify-text-field.css': 'styleFiles.vuetifyTextFieldCss',
}

export function styleFileTitle (name: string): string {
  const key = STYLE_FILE_TITLES[name]
  return key ? t(key) : name
}
