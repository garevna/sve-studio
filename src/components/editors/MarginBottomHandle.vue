<script setup lang="ts">
  import { computed, onBeforeUnmount } from 'vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { readMarginBottomPx, writeMarginBottomPx } from '@/utils/margin-bottom-class'

  // Margin is trailing empty space after an item, not clipped content - so
  // unlike ResizableWrapper.vue (which wraps a slot and clips it to a fixed
  // height), this renders as its own thin strip placed after the item,
  // sized to the current margin value itself. Same drag-interaction family
  // (mousedown/touchstart -> window move/end tracking) as ResizableWrapper,
  // but snapped to Vuetify's mb-{0..16} step scale (4px increments) on every
  // move rather than continuous, so the value shown while dragging is
  // always already a valid "multiple of 4" - no separate snap-on-drop step.
  const mode = useEditorMode()

  const classString = defineModel<string | undefined>('class', { default: '' })

  const px = computed({
    get: () => readMarginBottomPx(classString.value),
    set: (value: number) => {
      classString.value = writeMarginBottomPx(classString.value, value)
    },
  })

  const MAX_PX = 64

  let dragging = false
  let startY = 0
  let startPx = 0
  let moveHandler: EventListener
  let upHandler: EventListener

  function startDrag (e: MouseEvent | TouchEvent) {
    dragging = true
    startY = 'touches' in e ? (e as TouchEvent).touches[0]?.clientY || 0 : (e as MouseEvent).clientY
    startPx = px.value

    moveHandler = (ev: Event) => onMove(ev as MouseEvent | TouchEvent)
    upHandler = () => endDrag()

    window.addEventListener('mousemove', moveHandler)
    window.addEventListener('touchmove', moveHandler, { passive: false })
    window.addEventListener('mouseup', upHandler)
    window.addEventListener('touchend', upHandler)
  }

  function onMove (e: MouseEvent | TouchEvent) {
    if (!dragging) return
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : (e as MouseEvent).clientY
    const dy = clientY - startY
    px.value = Math.max(0, Math.min(MAX_PX, Math.round((startPx + dy) / 4) * 4))
  }

  function endDrag () {
    if (!dragging) return
    dragging = false
    window.removeEventListener('mousemove', moveHandler)
    window.removeEventListener('touchmove', moveHandler)
    window.removeEventListener('mouseup', upHandler)
    window.removeEventListener('touchend', upHandler)
  }

  onBeforeUnmount(() => {
    if (dragging) endDrag()
  })
</script>

<template>
  <div
    v-if="mode === 'edit'"
    class="margin-bottom-handle"
    :style="{ height: Math.max(8, px) + 'px' }"
    :title="t('common.marginBottom')"
    @mousedown.prevent="startDrag"
    @touchstart.prevent="startDrag"
  >
    <span class="margin-bottom-handle-value">{{ px }}px</span>
  </div>
</template>

<style scoped>
.margin-bottom-handle {
  width: 100%;
  cursor: row-resize;
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s ease;
}
.margin-bottom-handle:hover {
  background: rgba(0, 0, 0, 0.12);
}
.margin-bottom-handle-value {
  font-size: 10px;
  color: #7A8699;
  user-select: none;
}
</style>
