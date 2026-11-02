import type { TranslatedModel } from '@/types/TemplateBlockModel'
import { ref } from 'vue'

// The SITE's content languages - chosen per client in global.json
// ("locales" + "defaultLocale"), not fixed in code. Every translated text
// is stored as { "<locale>": "text", ... }.
//
// Not to be confused with the editor's own interface language (src/i18n).

export type LocaleModel = string

// Used until global.json says otherwise (and for content that predates the
// setting).
const FALLBACK_LOCALES = ['uk', 'en', 'de']

// "uk", "en", "de", "pt-BR", "zh-Hant"...
const LOCALE_CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/

export function isLocaleCode (value: unknown): value is string {
  return typeof value === 'string' && LOCALE_CODE.test(value)
}

const siteLocalesRef = ref<string[]>([...FALLBACK_LOCALES])
const defaultLocaleRef = ref<string>(FALLBACK_LOCALES[0] as string)

// Reactive: components that read these re-render when the setting changes.
export function siteLocales (): string[] {
  return siteLocalesRef.value
}

export function defaultSiteLocale (): string {
  return defaultLocaleRef.value
}

// Called with global.json's values at startup and whenever they change in
// the settings screen. Invalid or empty input falls back to the defaults;
// the default locale is always one of the list.
export function setSiteLocales (locales: unknown, defaultLocale?: unknown) {
  const list = Array.isArray(locales)
    ? [...new Set(locales.filter(code => isLocaleCode(code)))]
    : []
  siteLocalesRef.value = list.length > 0 ? list : [...FALLBACK_LOCALES]
  defaultLocaleRef.value = isLocaleCode(defaultLocale) && siteLocalesRef.value.includes(defaultLocale)
    ? defaultLocale
    : siteLocalesRef.value[0] as string
}

// A translated text is an object whose keys are all locale codes, at least
// one of them a language this site uses (or used to: texts of a language
// removed from the settings are kept, just not shown) - so a plain object
// like { src, alt } is never mistaken for one.
export function isTranslatedModel (value: unknown): value is TranslatedModel {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const entries = Object.entries(value)
  if (entries.length === 0) {
    return false
  }
  const known = new Set([...siteLocalesRef.value, ...FALLBACK_LOCALES])
  return entries.every(([key, text]) => isLocaleCode(key) && (typeof text === 'string' || Array.isArray(text)))
    && entries.some(([key]) => known.has(key))
}

function hasText (value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) {
    return value.some(line => typeof line === 'string' && line.trim() !== '')
  }
  return typeof value === 'string' && value.trim() !== ''
}

// What the SITE shows: the requested language, else the default one, else
// any language that has text - a page never shows a blank where some
// translation exists.
function pick (value: TranslatedModel, locale: LocaleModel): string | string[] {
  if (hasText(value[locale])) {
    return value[locale] as string | string[]
  }
  if (hasText(value[defaultLocaleRef.value])) {
    return value[defaultLocaleRef.value] as string | string[]
  }
  const any = Object.values(value).find(text => hasText(text))
  return any ?? value[locale] ?? ''
}

// A text in one language - exactly that language, no stand-in from another
// one. That's what the site itself shows (an untranslated text is blank
// there), and in an edit field a gap has to look like a gap.
export function resolveLocaleText (value: TranslatedModel | string | undefined, locale: LocaleModel): string {
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  const own = value[locale]
  return Array.isArray(own) ? own.join('\n') : (own ?? '')
}

/** Same as resolveLocaleText but keeps multi-line content as separate lines (dark-fone-section / card lists). */
export function resolveLocaleLines (value: TranslatedModel | string | undefined, locale: LocaleModel): string[] {
  if (!value) {
    return []
  }
  if (typeof value === 'string') {
    return value ? [value] : []
  }
  const own = value[locale]
  return Array.isArray(own) ? own : (own ? [own] : [])
}

// Kept as an alias - edit fields used to need a separate strict variant.
export const localeTextStrict = resolveLocaleText

// Images and other per-language ASSETS: one picture usually serves every
// language, so a language without its own falls back to the default one's.
export function resolveLocaleAsset (value: TranslatedModel | string | undefined, locale: LocaleModel): string {
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  const resolved = pick(value, locale)
  return Array.isArray(resolved) ? resolved.join('\n') : resolved
}

// When this language's text is empty but another language has one: that
// other text (default language first), to show as a hint. Otherwise ''.
export function translationHint (value: TranslatedModel | string | undefined, locale: LocaleModel): string {
  if (!value || typeof value === 'string' || hasText(value[locale])) {
    return ''
  }
  const source = hasText(value[defaultLocaleRef.value])
    ? value[defaultLocaleRef.value]
    : Object.values(value).find(text => hasText(text))
  if (!source) {
    return ''
  }
  return Array.isArray(source) ? source.join('\n') : source
}

export function emptyTranslatedModel (): TranslatedModel {
  return Object.fromEntries(siteLocalesRef.value.map(locale => [locale, '']))
}

/** Loop-friendly setter (a computed per v-for row is awkward) - mutates block.content in place. */
export function setLocalizedContent (block: { content?: TranslatedModel | string }, locale: LocaleModel, value: string): void {
  if (!isTranslatedModel(block.content)) {
    block.content = emptyTranslatedModel()
  }
  (block.content as TranslatedModel)[locale] = value
}

// A picture just uploaded for one language goes into every language that
// has none yet - otherwise the site shows a hole in those languages. A
// language that already has a picture of its own keeps it. Temporary
// blob:/data: previews are never spread.
export function fillEmptyLocaleSlots (block: { content?: TranslatedModel | string }, value: string): void {
  if (!value || value.startsWith('blob:')) {
    return
  }
  if (!isTranslatedModel(block.content)) {
    block.content = emptyTranslatedModel()
  }
  const content = block.content as TranslatedModel
  for (const locale of siteLocalesRef.value) {
    if (!content[locale]) {
      content[locale] = value
    }
  }
}

/**
 * Any plain-string text field (freshly inserted, or from older demo data)
 * gets wrapped into a translated model, the same text in every site
 * language, so every read site can safely index by locale.
 */
export function normalizeTranslatedFields<T extends { type?: string, content?: unknown, title?: unknown, text?: unknown, children?: T[] }> (block: T): T {
  const wrap = (text: string) => Object.fromEntries(siteLocalesRef.value.map(locale => [locale, text]))
  if (block.type !== 'component') {
    if (typeof block.content === 'string') {
      block.content = wrap(block.content) as never
    }
    if (typeof block.title === 'string') {
      block.title = wrap(block.title) as never
    }
    // block.text is overloaded: translated body copy for dark-fone-section
    // (and its cards), but a plain CSS class string for text-with-icon - only
    // the former should ever be wrapped into a translated model.
    if (block.type !== 'text-with-icon' && typeof block.text === 'string') {
      block.text = wrap(block.text) as never
    }
  }
  if (Array.isArray(block.children)) {
    for (const child of block.children) {
      normalizeTranslatedFields(child)
    }
  }
  return block
}

// How many texts in `root` (a page, a footer, any content tree) are missing
// in each site language. A text counts as missing in a language only when
// some other language already has it - a field left empty everywhere is not
// a translation gap.
export function missingTranslations (root: unknown, locales: string[] = siteLocalesRef.value): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(locales.map(locale => [locale, 0]))
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item)
      }
      return
    }
    if (typeof node !== 'object' || node === null) {
      return
    }
    if (isTranslatedModel(node)) {
      const filled = locales.filter(locale => hasText(node[locale]))
      // A per-language picture/link, not a text: an empty slot there falls
      // back to the default language's file (resolveLocaleAsset).
      if (filled.some(locale => looksLikeAsset(node[locale]))) {
        return
      }
      if (filled.length > 0 && filled.length < locales.length) {
        for (const locale of locales) {
          if (!filled.includes(locale)) {
            counts[locale] = (counts[locale] ?? 0) + 1
          }
        }
      }
      return
    }
    for (const value of Object.values(node)) {
      visit(value)
    }
  }
  visit(root)
  return counts
}

function looksLikeAsset (value: string | string[] | undefined): boolean {
  return typeof value === 'string'
    && (/^(?:\/|https?:|data:|blob:)/.test(value.trim()) || /\.(?:png|jpe?g|webp|avif|gif|svg)(?:\?.*)?$/i.test(value.trim()))
}

export function totalMissing (counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

// "українська", "English", "Deutsch"... - each language in its own name,
// so a client recognises theirs regardless of the editor's language.
export function localeDisplayName (locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(locale)
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : locale
  } catch {
    return locale
  }
}
