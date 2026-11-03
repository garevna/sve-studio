<script setup lang="ts">
  import type { PageBlockUnit } from '@/composables/usePageBlocks'
  import { SveButton, SveIconButton, SveSheet } from '@sve/editor-ui'
  import Sortable from 'sortablejs'
  import { onBeforeUnmount, ref, watch } from 'vue'
  import { usePageBlocks } from '@/composables/usePageBlocks'
  import { t } from '@/i18n'
  import { stableKey } from '@/utils/stable-key'

  // The page as a list of its blocks, by name: drag a row by its handle to
  // move the block, the eye hides or shows it, a click on the name scrolls
  // to the block. Moving blocks here instead of on the page itself - a page
  // block is often taller than the screen, dragging it there was hopeless.
  //
  // The hero parallax is listed first and does not move: it is drawn above
  // the page wherever it sits in the page's blocks.
  const open = defineModel<boolean>({ default: false })
  defineProps<{ canAdd?: boolean }>()
  const emit = defineEmits<{ add: [] }>()

  const pageBlocks = usePageBlocks()
  const { units, heroBlock } = pageBlocks

  const list = ref<HTMLElement | null>(null)
  let sortable: Sortable | null = null

  // Sortable moves the row in the DOM itself; the row is put back and the
  // page's blocks are reordered instead, so Vue alone decides what is drawn.
  watch(list, element => {
    sortable?.destroy()
    sortable = null
    if (!element) {
      return
    }
    sortable = Sortable.create(element, {
      animation: 150,
      handle: '.sve-outline__handle',
      // Pointer events rather than the browser's own drag and drop: the same
      // behaviour with a mouse and a finger.
      forceFallback: true,
      draggable: '.sve-outline__row',
      ghostClass: 'sve-outline__ghost',
      chosenClass: 'sve-outline__chosen',
      onEnd (event) {
        const { oldIndex, newIndex, item, from } = event
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
          return
        }
        item.remove()
        from.insertBefore(item, from.children[oldIndex] ?? null)
        const order = [...units.value]
        const [moved] = order.splice(oldIndex, 1)
        order.splice(newIndex, 0, moved!)
        pageBlocks.reorder(order)
        pageBlocks.reveal(moved!.block)
      },
    })
  })
  onBeforeUnmount(() => sortable?.destroy())

  function toggleHidden (unit: PageBlockUnit) {
    if (unit.block.hidden) {
      pageBlocks.restore(unit.block)
    } else {
      pageBlocks.hide(unit.block)
    }
  }

  function show (unit: PageBlockUnit) {
    if (!unit.block.hidden) {
      pageBlocks.reveal(unit.block)
    }
  }

  function edit (unit: PageBlockUnit) {
    if (unit.block.hidden) {
      pageBlocks.restore(unit.block)
    } else {
      pageBlocks.reveal(unit.block)
    }
    pageBlocks.edit(unit.block)
    // On a phone the sheet covers the page - get it out of the way.
    if (window.matchMedia('(max-width: 720px)').matches) {
      open.value = false
    }
  }
</script>

<template>
  <SveSheet v-model="open" :subtitle="t('block.count', { length: units.length })" :title="t('block.structureTitle')">
    <div class="sve-outline">
      <div v-if="heroBlock" class="sve-outline__row sve-outline__row--fixed" :title="t('block.heroAlwaysTop')">
        <span class="sve-outline__handle sve-outline__handle--none"><i class="sve-icon mdi mdi-pin-outline" /></span>
        <span class="sve-outline__label">{{ t('block.heroParallax') }}</span>
      </div>
      <div ref="list" class="sve-outline">
        <div
          v-for="unit of units"
          :key="stableKey(unit.block)"
          :class="['sve-outline__row', {
            'sve-outline__row--hidden': unit.block.hidden,
            'sve-outline__row--active': pageBlocks.isActive(unit.block),
          }]"
        >
          <span :aria-label="t('block.drag')" class="sve-outline__handle" :title="t('block.dragHint')">
            <i class="sve-icon mdi mdi-drag-vertical" />
          </span>
          <span class="sve-outline__label" :title="unit.label" @click="show(unit)">{{ unit.label }}</span>
          <SveIconButton icon="mdi-pencil-outline" :label="t('block.editShort')" size="sm" @click="edit(unit)" />
          <SveIconButton
            :icon="unit.block.hidden ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :label="unit.block.hidden ? t('editor.showOnPage') : t('block.hide')"
            size="sm"
            @click="toggleHidden(unit)"
          />
        </div>
      </div>
    </div>
    <template v-if="canAdd" #footer>
      <SveButton block icon="mdi-plus" variant="primary" @click="emit('add')">{{ t('blockMenu.addBlock') }}</SveButton>
    </template>
  </SveSheet>
</template>
