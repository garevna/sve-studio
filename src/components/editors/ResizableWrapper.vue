<script setup lang="ts">
  import { onBeforeUnmount } from 'vue'
  import { useEditorMode } from '@/composables/useEditorMode'

  const mode = useEditorMode()

  const props = defineProps<{
    minHeight?: number
    resize?: boolean
  }>()

  const height = defineModel<number>('height', { default: 300 })

  const minHeight = props.minHeight ?? 200

  let dragging = false
  let startY = 0
  let startH = 0
  let moveHandler: EventListener
  let upHandler: EventListener

  // const resizerContainer = ref<HTMLElement | null>(null)

  function startDrag (e: MouseEvent | TouchEvent) {
    dragging = true
    startY = 'touches' in e ? (e as TouchEvent).touches[0]?.clientY || 0 : (e as MouseEvent).clientY
    startH = height.value

    moveHandler = (ev: Event) => onMove(ev as MouseEvent | TouchEvent)
    upHandler = () => endDrag()

    window.addEventListener('mousemove', moveHandler as any)
    window.addEventListener('touchmove', moveHandler as any, { passive: false })
    window.addEventListener('mouseup', upHandler as any)
    window.addEventListener('touchend', upHandler as any)
  }

  function onMove (e: MouseEvent | TouchEvent) {
    if (!dragging) return
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : (e as MouseEvent).clientY
    const dy = clientY - startY
    const nh = Math.max(minHeight, startH + dy)
    height.value = nh
  }

  function endDrag () {
    if (!dragging) return
    dragging = false
    window.removeEventListener('mousemove', moveHandler as any)
    window.removeEventListener('touchmove', moveHandler as any)
    window.removeEventListener('mouseup', upHandler as any)
    window.removeEventListener('touchend', upHandler as any)
  }

  onBeforeUnmount(() => {
    if (dragging) endDrag()
  })
</script>

<template>
  <div ref="resizerContainer" class="ri-container" :style="{ width: '100%' }">
    <div class="resize-wrapper" :style="{ height: height + 'px' }">
      <slot />
    </div>
    <div
      v-if="mode === 'edit' && props.resize"
      class="ri-handle d-flex align-center justify-center"
      @mousedown.prevent="startDrag"
      @touchstart.prevent="startDrag"
    >
      ⚌
    </div>
  </div>
</template>

<style scoped>
.ri-container {
  width: 100%;
  position: relative;
  display: inline-block;
}
.resize-wrapper {
  width: 100%;
  overflow: hidden;
}
.ri-handle {
  height: 12px;
  cursor: row-resize;
  background: rgba(0,0,0,0.08);
  width: 100%;
  position: relative;
}
</style>
