// Who is sitting in front of the editor, and therefore which of its sections
// they see on the home screen. This is a "don't hand someone eleven buttons
// when five of them can only get them into trouble" filter, NOT a security
// boundary: the role is chosen right in the UI, nothing on the backend knows
// about it (the API hands over an access token with no role/scope of any
// kind - see docs/api-requirements.md), and a typed-in URL still reaches any
// section. Real enforcement would have to come from the token.
//
// Where this is going (agreed as direction, not yet with the backend): the
// role will arrive from the backend at startup - either parsed out of the
// access token, or handed over in the address bar the same way the token
// already is. A supervisor-only "Ролі" section, where roles are created and
// their access configured, is a possibility further out. None of that can be
// specified properly until the editor itself is finished, so the lists below
// stay a deliberate first cut: they encode the intent, and setRole() is the
// single place a backend-supplied role would later be fed in.

export type EditorRoleModel = 'content-manager' | 'seo' | 'designer' | 'developer' | 'supervisor'

// One entry per home-screen tile. Kept here rather than in HomeView.vue so
// that a role's own allow-list and the buttons it filters can't drift apart:
// adding a section means adding it here, and every role's list is checked
// against these keys by the type system.
export type EditorSectionKey
  = | 'palette'
    | 'ui-kit'
    | 'general-settings'
    | 'seo'
    | 'styles'
    | 'header'
    | 'footer'
    | 'pages'
    | 'menu'
    | 'account'

// group: where the section sits on the start screen - what is on the
// site, how it looks, how it is set up.
export type EditorSectionGroup = 'content' | 'look' | 'settings'

export type EditorSection = {
  key: EditorSectionKey
  title: string
  description: string
  icon: string
  to: string
  group: EditorSectionGroup
}

export const EDITOR_SECTION_GROUPS: { key: EditorSectionGroup, title: string }[] = [
  { key: 'content', title: 'Контент' },
  { key: 'look', title: 'Вигляд' },
  { key: 'settings', title: 'Налаштування' },
]

export const EDITOR_SECTIONS: EditorSection[] = [
  { key: 'pages', title: 'Сторінки', description: 'Створення та редагування сторінок сайту', icon: 'mdi-file-multiple-outline', to: '/pages', group: 'content' },
  { key: 'menu', title: 'Меню', description: 'Пункти головного меню', icon: 'mdi-menu', to: '/menu', group: 'content' },
  { key: 'header', title: 'Верхня частина сторінки', description: 'Меню й банер угорі кожної сторінки', icon: 'mdi-page-layout-header', to: '/header', group: 'content' },
  { key: 'footer', title: 'Нижня частина сторінки', description: 'Контакти, посилання та іконки внизу', icon: 'mdi-page-layout-footer', to: '/footer', group: 'content' },
  { key: 'palette', title: 'Палітра', description: 'Кольори сайту', icon: 'mdi-palette-outline', to: '/palette', group: 'look' },
  { key: 'ui-kit', title: 'UI Kit', description: 'Вигляд кнопок, карток і полів', icon: 'mdi-view-grid-outline', to: '/ui-kit', group: 'look' },
  { key: 'styles', title: 'Стилі', description: 'Файли CSS сайту', icon: 'mdi-language-css3', to: '/styles', group: 'look' },
  { key: 'general-settings', title: 'Загальні налаштування', description: 'Мови, шрифти, логотип, дані компанії', icon: 'mdi-cog-outline', to: '/general-settings', group: 'settings' },
  { key: 'seo', title: 'SEO', description: 'Заголовки та описи для пошукових систем', icon: 'mdi-magnify', to: '/seo', group: 'settings' },
  { key: 'account', title: 'Особистий кабінет', description: 'Сторінки кабінету клієнта', icon: 'mdi-account-circle-outline', to: '/account', group: 'settings' },
]

export type EditorRole = {
  value: EditorRoleModel
  title: string
  icon: string
  // Shown under the home screen's own tiles, so whoever switched roles can
  // see why the button they remember is missing.
  hint: string
  // null = every section (supervisor). Anything else is an explicit list.
  sections: EditorSectionKey[] | null
  // false = pages open read-only: the editor's own mode switch is gone and
  // the page is shown exactly as a visitor would see it. Per-page SEO stays
  // editable, which is the whole point for the SEO role.
  canEditPageContent: boolean
  // 'basic' hides the parts of global.json that need judgement to get right
  // (font name, layout spacing) and leaves the ones that are plainly the
  // site owner's own data: company name, logo, social links, hero banner.
  generalSettingsScope: 'basic' | 'full'
}

export const EDITOR_ROLES: EditorRole[] = [
  {
    value: 'content-manager',
    title: 'Контент-менеджер',
    icon: 'mdi-account-edit',
    hint: 'Сторінки, меню, футер, банер і дані компанії. Без стилів, палітри та технічних налаштувань.',
    // 'menu' is here provisionally - the project owner wasn't sure whether
    // main-menu editing belongs to this role; drop the key to take it away.
    sections: ['pages', 'menu', 'header', 'footer', 'general-settings'],
    canEditPageContent: true,
    generalSettingsScope: 'basic',
  },
  {
    value: 'seo',
    title: 'SEO-спеціаліст',
    icon: 'mdi-magnify',
    hint: 'Глобальне SEO та SEO кожної сторінки. Сторінки відкриваються лише для перегляду.',
    sections: ['seo', 'pages'],
    canEditPageContent: false,
    generalSettingsScope: 'full',
  },
  {
    value: 'designer',
    title: 'Дизайнер',
    icon: 'mdi-palette-swatch',
    hint: 'Палітра, UI Kit, сторінки, футер і банер hero-секції.',
    // 'styles' is deliberately ABSENT, and this is not an oversight to fix:
    // a designer who works in Figma usually has no working model of how a
    // browser resolves CSS, and the vuetify-*.css files are worse still -
    // editing them safely takes an understanding of how the framework's own
    // components are built, which is close to unrealistic to assume. The
    // intended path for a designer to influence how blocks look is the UI
    // Kit section, which will grow controls for exactly that, over
    // properties whose meaning is visible in the control itself.
    sections: ['palette', 'ui-kit', 'pages', 'header', 'footer'],
    canEditPageContent: true,
    generalSettingsScope: 'full',
  },
  {
    value: 'developer',
    title: 'Розробник',
    icon: 'mdi-code-braces',
    hint: 'Усі технічні розділи, включно з файлами стилів і темою Vuetify.',
    // The counterpart to the designer role above: this is the person the
    // CSS files ARE safe with, so 'styles' lives here and nowhere else
    // below supervisor. Everything except 'seo' - that one belongs to the
    // SEO specialist, and a developer who genuinely needs it is one key
    // away (or one switch to supervisor).
    sections: ['styles', 'palette', 'ui-kit', 'general-settings', 'pages', 'menu', 'header', 'footer', 'account'],
    canEditPageContent: true,
    generalSettingsScope: 'full',
  },
  {
    value: 'supervisor',
    title: 'Супервайзер',
    icon: 'mdi-shield-account',
    hint: 'Повний доступ до всіх розділів редактора.',
    sections: null,
    canEditPageContent: true,
    generalSettingsScope: 'full',
  },
]

// The narrowest role on purpose: an unprepared client meeting the full
// eleven-button board is the thing this whole switcher exists to avoid.
// Whoever needs more switches once and the choice is remembered.
export const DEFAULT_EDITOR_ROLE: EditorRoleModel = 'content-manager'

export function editorRole (value: EditorRoleModel): EditorRole {
  return EDITOR_ROLES.find(role => role.value === value)
    ?? EDITOR_ROLES.find(role => role.value === DEFAULT_EDITOR_ROLE)!
}

export function sectionsForRole (value: EditorRoleModel): EditorSection[] {
  const { sections } = editorRole(value)
  if (!sections) {
    return EDITOR_SECTIONS
  }
  const allowed = new Set<EditorSectionKey>(sections)
  return EDITOR_SECTIONS.filter(section => allowed.has(section.key))
}
