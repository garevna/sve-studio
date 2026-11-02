// A picture for this language - or, when this language has none, the
// default language's, else any language's. The editor shows the same
// fallback (resolveLocaleAsset), so a page never has a picture there and a
// hole here.
export function localeAsset (value: unknown, locale: string, defaultLocale: string): string {
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  const slots = value as Record<string, unknown>
  const pick = (key: string) => typeof slots[key] === 'string' ? slots[key] as string : ''
  return pick(locale) || pick(defaultLocale) || Object.keys(slots).map(key => pick(key)).find(Boolean) || ''
}
