import type { SetButton } from '@/utils/button-set'
import { ref } from 'vue'
import { templateOf } from '@/configs/button-catalog'
import { useAjaxStore } from '@/stores/ajax'
import { BUTTON_SET_FILE, parseButtonSet } from '@/utils/button-set'

// The buttons a page's button can be given: the client's own set from the
// UI Kit (utils/button-set.ts) - by the names the client gave them - and
// nothing from our catalogue they did not take.
export interface ButtonVariant {
  // the class a button block stores
  className: string
  // the client's name for it
  name: string
  // its kind in the catalogue
  template: string
}

// Module-level: one fetch for a page that may hold a dozen button blocks.
// The UI Kit hands its edits over (forgetButtonVariants), so a button just
// added there is offered here without reloading.
const variants = ref<ButtonVariant[]>([])
let loading: Promise<void> | null = null

function fromSet (buttons: SetButton[]): ButtonVariant[] {
  return buttons.map(({ className, name, template }) => ({ className, name, template }))
}

export function forgetButtonVariants (buttons: SetButton[]) {
  variants.value = fromSet(buttons)
  loading = Promise.resolve()
}

// A look built around an icon (its kind says so - "icon on the right"):
// a button given that look needs one, so the button's settings ask for it.
// Takes a whole class string, like the block stores. Known once the set has
// been loaded (useButtonVariants().load).
export function lookNeedsIcon (className: string): boolean {
  const tokens = className.split(' ')
  const variant = variants.value.find(item => tokens.includes(item.className))
  return !!variant && !!templateOf(variant.template).needsIcon
}

export function useButtonVariants () {
  const ajaxStore = useAjaxStore()

  function load (): Promise<void> {
    loading ??= (async () => {
      const css = await ajaxStore.getStyleFile(BUTTON_SET_FILE)
      variants.value = fromSet(parseButtonSet(css) ?? [])
    })()
    return loading
  }

  return { variants, load }
}
