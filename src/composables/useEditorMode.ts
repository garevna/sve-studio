import type { ComputedRef, InjectionKey } from 'vue'
import { computed, inject, provide } from 'vue'
import { useCommonStore } from '@/stores/common'

export type EditorMode = 'edit' | 'preview' | 'drag'

// The mode a component should render in. Usually the editor's own mode
// (the switch in the top bar) - but on a page, only the block being edited
// is in 'edit'; every other block renders in 'preview', exactly as the site
// shows it (see PageBlockFrame.vue, which provides that per block).
//
// Every component that draws editing controls reads its mode here, never
// commonStore.mode directly - otherwise it would show them in every block
// at once.
const EDITOR_MODE: InjectionKey<ComputedRef<EditorMode>> = Symbol('editor-mode')

export function useEditorMode (): ComputedRef<EditorMode> {
  const own = inject(EDITOR_MODE, null)
  if (own) {
    return own
  }
  const commonStore = useCommonStore()
  return computed(() => commonStore.mode)
}

export function provideEditorMode (mode: ComputedRef<EditorMode>) {
  provide(EDITOR_MODE, mode)
}
