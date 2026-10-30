import type { ComputedRef, InjectionKey } from 'vue'
import { computed, inject, provide } from 'vue'

// The footer's background colour (a palette key), for editing surfaces deep
// inside the footer that show its texts away from it - in a dialog, texts
// meant for a dark footer are only readable on that same background.
const FOOTER_BACKGROUND: InjectionKey<ComputedRef<string>> = Symbol('footer-background')

export function provideFooterBackground (key: ComputedRef<string>) {
  provide(FOOTER_BACKGROUND, key)
}

export function useFooterBackground (): ComputedRef<string> {
  return inject(FOOTER_BACKGROUND, computed(() => 'primary'))
}
