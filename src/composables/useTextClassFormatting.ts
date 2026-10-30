import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { NON_COLOR_TEXT_CLASSES, SIZE_SCALE, WEIGHT_SCALE } from '@/utils/text-format-scale'

// Same class-toggling logic TextEditor.vue owns for its own contenteditable
// text blocks, extracted so EditableCard.vue can drive the same formatting
// (via TextFormatMenu.vue) for two independent fields - card title and card
// content - without duplicating it twice inline. TextEditor.vue keeps its
// own inline copy rather than being refactored to use this - it's a stable,
// widely-used component and this is a separate, deliberate reuse, not a
// general dedupe pass.
export function useTextClassFormatting (classModel: Ref<string>) {
  const classSet = ref(new Set((classModel.value || '').split(' ').filter(Boolean)))
  const classList = computed(() => [...classSet.value].join(' '))

  const colorKey = computed(() => {
    const found = [...classSet.value].find(c => c.startsWith('text-') && !NON_COLOR_TEXT_CLASSES.has(c))
    return found ? found.replace('text-', '') : ''
  })

  function toggleColor (key: string) {
    for (const c of classSet.value) {
      if (c.startsWith('text-') && !NON_COLOR_TEXT_CLASSES.has(c)) {
        classSet.value.delete(c)
      }
    }
    classSet.value.add(`text-${key}`)
    classModel.value = classList.value
  }

  function toggleAlign (align: 'text-left' | 'text-center' | 'text-right') {
    classSet.value.delete('text-left')
    classSet.value.delete('text-center')
    classSet.value.delete('text-right')
    classSet.value.add(align)
    classModel.value = classList.value
  }

  function setFontSize (size: string) {
    if (!SIZE_SCALE.includes(size)) {
      return
    }
    for (const s of SIZE_SCALE) {
      classSet.value.delete(s)
    }
    classSet.value.add(size)
    classModel.value = classList.value
  }

  function toggleWeight (direction: 'increase' | 'decrease') {
    const currentIndex = WEIGHT_SCALE.findIndex(weight => classSet.value.has(weight))
    const fromIndex = currentIndex === -1 ? WEIGHT_SCALE.indexOf('text-medium') : currentIndex
    const toIndex = direction === 'increase' ? fromIndex + 1 : fromIndex - 1
    if (toIndex < 0 || toIndex >= WEIGHT_SCALE.length) {
      return
    }
    for (const weight of WEIGHT_SCALE) {
      classSet.value.delete(weight)
    }
    classSet.value.add(WEIGHT_SCALE[toIndex] as string)
    classModel.value = classList.value
  }

  return { colorKey, toggleColor, toggleAlign, setFontSize, toggleWeight }
}
