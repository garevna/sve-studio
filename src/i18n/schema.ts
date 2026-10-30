import type uk from './locales/uk'

// Ukrainian is the source of truth for the key structure: every other
// locale is typed against it, so a missing or misspelt key fails type-check.
export type MessageSchema = typeof uk
