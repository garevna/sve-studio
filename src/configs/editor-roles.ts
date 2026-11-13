// Who is sitting in front of the editor: which of its sections they see on
// the home screen, and - on a deployment that signs people in - which
// content they may actually write.
//
// The lists below are read twice, and that is the point of keeping them
// here rather than in the views:
//   - the home screen filters its tiles through sectionsForRole();
//   - the content API refuses writes through mayWriteContent() at the
//     bottom of this file (server/content-api/middleware.ts).
// Two tables of permissions always drift apart; this is one table.
//
// How much weight the role carries depends on the deployment:
//   - the in-browser demo and the old host-system path have no sign-in in
//     front of the API. The role is chosen in the interface and is a
//     "don't hand someone eleven buttons when five of them can only get
//     them into trouble" filter - a typed-in URL still reaches any section.
//   - NUXT_CONTENT_API_ACCESS=auth: the role comes from the server
//     (/api/users/me - stores/users.ts), the switcher on the home screen
//     turns into a label, and every save is checked against the same list
//     the tiles were filtered by. That is the enforcement this comment used
//     to say was still missing.
//
// Roles are given out in the "Користувачі" section (supervisor and owner
// only); an owner is set in the deployment itself and gets the supervisor's
// sections, which is all of them.

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
    | 'messages'
    | 'popups'
    | 'client-api'
    | 'dock-forms'
    | 'users'
    | 'log'
    | 'architecture'

// group: where the section sits on the start screen - what is on the
// site, how it looks, how it is set up - and, apart from all of that, the
// people who write in through the site.
export type EditorSectionGroup = 'visitors' | 'content' | 'look' | 'settings'

export type EditorSection = {
  key: EditorSectionKey
  icon: string
  to: string
  group: EditorSectionGroup
}

// The texts (titles, descriptions, role hints) are in
// src/i18n/messages/home.json, under these same keys.
export const EDITOR_SECTION_GROUPS: { key: EditorSectionGroup }[] = [
  { key: 'visitors' },
  { key: 'content' },
  { key: 'look' },
  { key: 'settings' },
]

export const EDITOR_SECTIONS: EditorSection[] = [
  { key: 'messages', icon: 'mdi-message-text-outline', to: '/messages', group: 'visitors' },
  { key: 'pages', icon: 'mdi-file-multiple-outline', to: '/pages', group: 'content' },
  { key: 'menu', icon: 'mdi-menu', to: '/menu', group: 'content' },
  { key: 'header', icon: 'mdi-page-layout-header', to: '/header', group: 'content' },
  { key: 'footer', icon: 'mdi-page-layout-footer', to: '/footer', group: 'content' },
  { key: 'popups', icon: 'mdi-dock-window', to: '/popups', group: 'content' },
  // The site's forms (forms.json): their look is the designer's, where
  // they send - the site's channel or the client's API - the developer's.
  { key: 'dock-forms', icon: 'mdi-form-select', to: '/forms', group: 'content' },
  { key: 'palette', icon: 'mdi-palette-outline', to: '/palette', group: 'look' },
  { key: 'ui-kit', icon: 'mdi-view-grid-outline', to: '/ui-kit', group: 'look' },
  { key: 'styles', icon: 'mdi-language-css3', to: '/styles', group: 'look' },
  { key: 'general-settings', icon: 'mdi-cog-outline', to: '/general-settings', group: 'settings' },
  { key: 'seo', icon: 'mdi-magnify', to: '/seo', group: 'settings' },
  { key: 'account', icon: 'mdi-account-circle-outline', to: '/account', group: 'settings' },
  // The docking block: the client's own API (packages/dock) - for whoever
  // connects the site to it, the developer.
  { key: 'client-api', icon: 'mdi-connection', to: '/client-api', group: 'settings' },
  // Not in any role's list below, so only a supervisor (sections: null) and
  // an owner ever see it: handing out roles is the one thing a role cannot
  // be given.
  { key: 'users', icon: 'mdi-account-multiple-outline', to: '/users', group: 'settings' },
  // The same: what went wrong is for whoever runs the deployment
  // (server/content-api/log-routes.ts lets nobody else read it).
  { key: 'log', icon: 'mdi-alert-circle-outline', to: '/log', group: 'settings' },
  // The project's schemes (ArchitectureView.vue): for whoever builds and
  // keeps the site - the developer and, as always, the supervisor.
  { key: 'architecture', icon: 'mdi-sitemap-outline', to: '/architecture', group: 'settings' },
]

export type EditorRole = {
  value: EditorRoleModel
  // Its title and hint (shown under the home screen's own tiles, so whoever
  // switched roles can see why the button they remember is missing) are in
  // messages/home.json, roles.<value>.
  icon: string
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
    icon: 'mdi-account-edit',
    // 'menu' is here provisionally - the project owner wasn't sure whether
    // main-menu editing belongs to this role; drop the key to take it away.
    sections: ['messages', 'pages', 'menu', 'header', 'footer', 'popups', 'general-settings'],
    canEditPageContent: true,
    generalSettingsScope: 'basic',
  },
  {
    value: 'seo',
    icon: 'mdi-magnify',
    sections: ['seo', 'pages'],
    canEditPageContent: false,
    generalSettingsScope: 'full',
  },
  {
    value: 'designer',
    icon: 'mdi-palette-swatch',
    // 'styles' is deliberately ABSENT, and this is not an oversight to fix:
    // a designer who works in Figma usually has no working model of how a
    // browser resolves CSS, and the vuetify-*.css files are worse still -
    // editing them safely takes an understanding of how the framework's own
    // components are built, which is close to unrealistic to assume. The
    // intended path for a designer to influence how blocks look is the UI
    // Kit section, which will grow controls for exactly that, over
    // properties whose meaning is visible in the control itself.
    sections: ['palette', 'ui-kit', 'pages', 'header', 'footer', 'dock-forms'],
    canEditPageContent: true,
    generalSettingsScope: 'full',
  },
  {
    value: 'developer',
    icon: 'mdi-code-braces',
    // The counterpart to the designer role above: this is the person the
    // CSS files ARE safe with, so 'styles' lives here and nowhere else
    // below supervisor. Everything except 'seo' - that one belongs to the
    // SEO specialist, and a developer who genuinely needs it is one key
    // away (or one switch to supervisor).
    sections: ['styles', 'palette', 'ui-kit', 'general-settings', 'pages', 'menu', 'header', 'footer', 'account', 'client-api', 'dock-forms', 'architecture'],
    canEditPageContent: true,
    generalSettingsScope: 'full',
  },
  {
    value: 'supervisor',
    icon: 'mdi-shield-account',
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

// ---------------------------------------------------------------------------
// The same lists, as the server reads them.
//
// Everything above decides which buttons a person is shown. Below is the
// other half of the same decision: which content a person may WRITE. It is
// derived from the very same `sections` lists on purpose - two tables of
// permissions always drift apart, and the only question is when. Adding a
// section above gives it a path here, or it is writable by nobody.
//
// Imported by server/content-api/middleware.ts. Keep it free of anything
// browser-only: it runs on the Nitro server too.

// Which section owns a content path. The paths are the content API's own
// (server/content-api/routes.ts), after its /api/content prefix.
export function sectionForContentPath (path: string): EditorSectionKey | null {
  const clean = path.split('?')[0]!.replace(/\/+$/, '')
  if (clean.startsWith('/pages')) {
    return 'pages'
  }
  if (clean.startsWith('/images')) {
    return 'pages'
  }
  // account-pages: the visitor's own account, edited with the pages
  if (clean.startsWith('/public')) {
    return 'pages'
  }
  if (clean.startsWith('/styles')) {
    return 'styles'
  }
  if (clean.startsWith('/settings/palette')) {
    return 'palette'
  }
  if (clean.startsWith('/settings/menu-content')) {
    return 'menu'
  }
  if (clean.startsWith('/settings/seo')) {
    return 'seo'
  }
  if (clean.startsWith('/settings/global')) {
    return 'general-settings'
  }
  if (clean.startsWith('/settings/popups')) {
    return 'popups'
  }
  if (clean.startsWith('/settings/client-api')) {
    return 'client-api'
  }
  if (clean.startsWith('/settings/forms')) {
    return 'dock-forms'
  }
  // An unknown path belongs to no section, so nobody below supervisor
  // writes it - a new route is closed until it is placed here.
  return null
}

// May this role write that path? A supervisor (sections: null) may write
// anything; an owner never reaches here, the server lets them through first.
export function mayWriteContent (role: EditorRoleModel, path: string): boolean {
  const { sections } = editorRole(role)
  if (!sections) {
    return true
  }
  const section = sectionForContentPath(path)
  return section !== null && sections.includes(section)
}
