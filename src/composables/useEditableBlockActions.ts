import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'

// Lets a leaf editor deeply nested under a "block"/"card" (TextEditor.vue,
// SwiperImagesEditor.vue, ImageEditor.vue, ButtonEditor.vue - reached
// through TemplateItem.vue's own generic dispatch, which has no toolbar of
// its own) Teleport its own action button(s) into the nearest ancestor
// EditableBlockWrapper's real toolbar, without threading a scoped slot
// through every intermediate layer and every one of EditableBlockWrapper's
// many callers. provide/inject naturally finds the nearest PROVIDING
// ancestor regardless of how many non-providing components (TemplateItem,
// TextWithIconEditor) sit in between.
const EDITABLE_BLOCK_ACTIONS_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('editable-block-actions-target')

export function provideBlockActionsTarget (target: Ref<HTMLElement | null>) {
  provide(EDITABLE_BLOCK_ACTIONS_KEY, target)
}

// No provider in the ancestor chain (e.g. a top-level header/title/text/
// button block, which DynamicPageTemplate.vue deliberately never wraps in
// EditableBlockWrapper) resolves to a permanently-null ref - callers use
// this with Teleport's own :disabled prop to fall back to rendering
// exactly in place, unchanged, whenever there's nowhere to teleport to.
export function useBlockActionsTarget (): Ref<HTMLElement | null> {
  return inject(EDITABLE_BLOCK_ACTIONS_KEY, ref(null))
}
