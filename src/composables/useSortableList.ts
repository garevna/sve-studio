import type { Ref } from 'vue'
import Sortable from 'sortablejs'
import { onMounted, onUnmounted, ref, watch } from 'vue'

// Shared drag-to-reorder wiring for any card-holding container ("cards"
// block, carousel, card-with-toolbar-image group, ...) - same library
// DynamicPageTemplate.vue already uses for reordering top-level page
// blocks, generalized to an arbitrary array. Gated on a per-block toggle
// (see "Перетягування" in the block's own fab-menu, e.g.
// CardContainerActions.vue) rather than the global edit/drag mode switch -
// dragging cards is a deliberate, occasional action, not something that
// should be live the whole time you're editing.
export function useSortableList<T> (getItems: () => T[] | undefined, active: Ref<boolean>) {
  const container = ref<HTMLElement | null>(null)
  let sortable: Sortable | null = null

  onMounted(() => {
    if (!container.value) {
      return
    }
    sortable = Sortable.create(container.value, {
      animation: 150,
      disabled: !active.value,
      onEnd (evt: { oldIndex?: number, newIndex?: number }) {
        const { oldIndex, newIndex } = evt
        if (typeof oldIndex !== 'number' || typeof newIndex !== 'number' || oldIndex === newIndex) {
          return
        }
        const items = getItems()
        if (!items) {
          return
        }
        const [moved] = items.splice(oldIndex, 1)
        if (moved) {
          items.splice(newIndex, 0, moved)
        }
      },
    })
  })

  watch(active, value => {
    sortable?.option('disabled', !value)
  })

  onUnmounted(() => {
    sortable?.destroy()
  })

  return { container }
}
