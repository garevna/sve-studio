export function getActiveTheme (): number {
  if (typeof location === 'undefined') {
    return 5
  }
  if (location.search.includes('theme=')) {
    const urlParams = new URLSearchParams(location.search)
    const themeParam = urlParams.get('theme')
    const themeValue = Number.parseInt(themeParam || '')
    if (themeValue) {
      return themeValue
    }
  }

  const storedTheme = localStorage.getItem('theme')
  if (storedTheme) {
    const themeValue = Number.parseInt(storedTheme)
    if (themeValue) {
      return themeValue
    }
  }

  // Demo default: the client-neutral demo theme.
  return 5
}
