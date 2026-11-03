// The editor's own interface language (uk / en / de) - independent of the
// site's content locale that the page editor switches between.
//
// Components use `const { t } = useI18n()` (or $t in templates); stores and
// plain modules use the exported `t`, which reads the current language at
// call time.
import type { MessageSchema } from './schema'
import { createI18n } from 'vue-i18n'
import { MESSAGES } from './messages'

export type EditorUiLocale = 'uk' | 'en' | 'de'

export const EDITOR_UI_LOCALES: { value: EditorUiLocale, title: string }[] = [
  { value: 'uk', title: 'UK' },
  { value: 'en', title: 'EN' },
  { value: 'de', title: 'DE' },
]

const STORAGE_KEY = 'editor-ui-locale'

function isLocale (value: unknown): value is EditorUiLocale {
  return value === 'uk' || value === 'en' || value === 'de'
}

// Saved choice first, then the browser's own language, then Ukrainian.
function initialLocale (): EditorUiLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) {
      return stored
    }
  } catch {
    // Storage blocked - fall through to the browser language.
  }
  // Only the browser's FIRST language counts: going down the list picked a
  // language the person merely tolerates (Russian first, German somewhere
  // below - and the editor came up in German). Anything else - Russian,
  // Belarusian, ... - gets Ukrainian.
  const first = (navigator.languages?.[0] ?? navigator.language ?? '').slice(0, 2).toLowerCase()
  if (isLocale(first)) {
    return first
  }
  return 'uk'
}

// One language's texts out of messages/*.json. An empty text is left out,
// so vue-i18n falls back to the Ukrainian one.
function textsIn (tree: Record<string, unknown>, locale: EditorUiLocale): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(tree)) {
    const node = value as Record<string, unknown>
    if (typeof node.uk === 'string') {
      const text = node[locale]
      if (typeof text === 'string' && text !== '') {
        result[key] = text
      }
    } else {
      result[key] = textsIn(node, locale)
    }
  }
  return result
}

const uk = textsIn(MESSAGES, 'uk') as MessageSchema
const en = textsIn(MESSAGES, 'en') as MessageSchema
const de = textsIn(MESSAGES, 'de') as MessageSchema

export const i18n = createI18n<[MessageSchema], EditorUiLocale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'uk',
  // An untranslated text showing in Ukrainian is the intended behaviour,
  // not a fault: no console warning for every one of them.
  missingWarn: false,
  fallbackWarn: false,
  messages: { uk, en, de },
})

type Translate = (key: string, named?: Record<string, unknown>) => string
const translate = i18n.global.t as unknown as Translate

// For stores and plain modules (components can use useI18n()).
export function t (key: string, named: Record<string, unknown> = {}): string {
  return translate(key, named)
}

export function editorUiLocale (): EditorUiLocale {
  return i18n.global.locale.value
}

export function setEditorUiLocale (locale: EditorUiLocale) {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not remembered across reloads - still applies now.
  }
}

// Texts edited on /editor-ui ("Тексти"), shown at once after saving.
export function applyMessages (tree: typeof MESSAGES) {
  for (const locale of EDITOR_UI_LOCALES) {
    i18n.global.setLocaleMessage(locale.value, textsIn(tree, locale.value) as MessageSchema)
  }
}
