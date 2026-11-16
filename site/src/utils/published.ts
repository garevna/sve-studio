// The owner's own site, built apart from the demo (SITE_PUBLISHED=1 at
// build time): it shows only the released content (db/published.ts) - never
// a visitor's drafts, never the editor's preview notes.
declare global {
  interface ImportMetaEnv {
    readonly VITE_SITE_PUBLISHED?: string
  }
}

export const PUBLISHED = import.meta.env.VITE_SITE_PUBLISHED === '1'
