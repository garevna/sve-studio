// CSS files have no title field of their own (unlike pages, whose title
// lives right in their content) - the file set is fixed by the theme build
// (see docs/api-requirements.md), so a static lookup is enough. Anything
// not listed here (a new file added later, before this map catches up)
// just falls back to showing its own raw name - see StylesListView.vue.
export const STYLE_FILE_TITLES: Record<string, string> = {
  'alert-blocks.css': 'Блоки-сповіщення',
  'buttons.css': 'Кнопки',
  'cards.css': 'Картки (UI Kit)',
  'common.css': 'Загальні стилі',
  'date-picker.css': 'Вибір дати',
  'faq.css': 'Питання та відповіді (FAQ)',
  'home.css': 'Головна сторінка',
  'inputs.css': 'Поля вводу',
  'locale-and-currency-switcher.css': 'Перемикач мови та валюти',
  'main-menu.css': 'Головне меню',
  'main.css': 'Основні стилі',
  'parallax.css': 'Паралакс-секції',
  'popups.css': 'Спливаючі вікна',
  'root.css': 'Кольори та змінні',
  'search-for-trip.css': 'Пошук поїздки',
  'typographics.css': 'Типографіка',
  'user-dashboard.css': 'Особистий кабінет',
  'vuetify-breadcrumbs.css': 'Хлібні крихти',
  'vuetify-buttons.css': 'Кнопки (Vuetify)',
  'vuetify-card.css': 'Картки (Vuetify)',
  'vuetify-components.css': 'Компоненти (Vuetify)',
  'vuetify-expansion-panel.css': 'Розгортні панелі (Vuetify)',
  'vuetify-overlay-content.css': 'Спливаючий контент (Vuetify)',
  'vuetify-slide-group.css': 'Групи слайдів (Vuetify)',
  'vuetify-tables.css': 'Таблиці (Vuetify)',
  'vuetify-text-field.css': 'Текстові поля (Vuetify)',
}

export function styleFileTitle (name: string): string {
  return STYLE_FILE_TITLES[name] ?? name
}
