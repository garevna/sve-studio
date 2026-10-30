// The page last opened in the page editor, remembered in this browser - the
// start screen offers to go straight back to it.

const KEY = 'sve-last-edited-page'

export function rememberEditedPage (pageId: string) {
  try {
    localStorage.setItem(KEY, pageId)
  } catch {
    // not remembered - nothing else depends on it
  }
}

export function lastEditedPage (): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
