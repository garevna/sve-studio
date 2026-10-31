import type { MESSAGES } from './messages'

// One text in all three languages (a leaf of messages/*.json).
export interface Translated { uk: string, en: string, de: string }

// What vue-i18n gets for one language: the same tree, a string per text.
// Typed from the JSON files, so a key used in the code but missing there
// fails type-check.
export type Texts<T> = { [K in keyof T]: T[K] extends Translated ? string : Texts<T[K]> }

export type MessageSchema = Texts<typeof MESSAGES>
