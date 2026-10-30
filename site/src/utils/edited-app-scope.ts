// Shared class name marking "this DOM subtree is the previewed app content" -
// see load-scoped-vuetify-styles.ts for why this boundary exists. Kept as a
// named export (not a bare string) so both sides can't drift out of sync.
export const EDITED_APP_SCOPE_CLASS = 'edited-app-scope'
