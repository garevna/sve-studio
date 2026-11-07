import { ref } from 'vue'
import { isTabClass } from '@/configs/tab-classes'
import { useAjaxStore } from '@/stores/ajax'
import { extractButtonEntries } from '@/utils/button-style-entry'

// Which button looks a page block can choose from: exactly the classes the
// UI Kit defines in buttons.css, read from the stylesheet itself rather than
// listed here - a hardcoded list would be wrong the first time a designer
// adds a button, and the whole point of the UI Kit is that it decides.
//
// Two kinds are left out. Tabs are not buttons a page can place (they only
// mean anything inside a tab strip - see configs/tab-classes.ts), and
// google-button carries an icon and a purpose of its own: it is the sign-in
// button, not a style to give to arbitrary content.
const EXCLUDED = new Set(['google-button'])

// Module-level: one fetch for a page that may hold a dozen button blocks,
// and the list cannot go stale within a session - a designer editing
// buttons.css is in the UI Kit, not on this page.
const variants = ref<string[]>([])
let loading: Promise<void> | null = null

// A look that is built around an icon says so in its name
// (button-with-icon-right): a button given that look needs one, so the
// button's settings ask for it. Takes a whole class string, like the block
// stores.
export function lookNeedsIcon (className: string): boolean {
  return className.split(' ').some(token => token.includes('button') && token.includes('icon'))
}

export function useButtonVariants () {
  const ajaxStore = useAjaxStore()

  function load (): Promise<void> {
    loading ??= (async () => {
      const css = await ajaxStore.getStyleFile('buttons.css')
      const { entries } = extractButtonEntries(css ?? '')
      variants.value = entries
        .map(entry => entry.className)
        .filter(className => !isTabClass(className) && !EXCLUDED.has(className))
        // eslint-disable-next-line unicorn/no-array-sort -- toSorted() isn't in this project's configured TS lib target
        .sort((a, b) => a.localeCompare(b))
    })()
    return loading
  }

  return { variants, load }
}
