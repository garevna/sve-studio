// Shared theme names - registered in main.ts's createVuetify() config, and
// referenced by name wherever a component needs to explicitly switch onto
// one (DynamicPageTemplate.vue's page-content wrapper, PreviewView.vue's
// v-app). Kept as named exports (not bare string literals scattered across
// files) so a future rename can't leave one spot out of sync the way the
// editorUi/editedApp -> editorTheme/appTheme rename briefly did.
export const EDITOR_THEME_NAME = 'editorTheme'
export const APP_THEME_NAME = 'appTheme'

// VThemeProvider's own `themeClasses` computed builds this same string
// (`${prefix}theme--${name}`, prefix defaults to 'v-') - duplicated here
// because that internal helper isn't part of Vuetify's public API surface
// (not re-exported from the package's "." entry point, only `useTheme` is,
// and that only reads an *already-established* theme context, it can't
// establish a new one the way `<v-theme-provider theme="...">` does).
export function themeClass (name: string): string {
  return `v-theme--${name}`
}
