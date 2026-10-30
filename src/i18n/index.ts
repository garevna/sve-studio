// The editor's own interface language (uk / en / de) - independent of the
// site's content locale that the page editor switches between.
//
// Components use `const { t } = useI18n()` (or $t in templates); stores and
// plain modules use the exported `t`, which reads the current language at
// call time.
import type { MessageSchema } from './schema'
import { createI18n } from 'vue-i18n'
import de from './locales/de'
import en from './locales/en'
import uk from './locales/uk'

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

export const i18n = createI18n<[MessageSchema], EditorUiLocale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'uk',
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
