<script setup lang="ts">
  import { useEditorMode } from '@/composables/useEditorMode'
  import { RESIZE_STEP, snapToStep, useHorizontalResize } from '@/composables/useHorizontalResize'

  // A footer section that can be resized by dragging its own right edge -
  // the horizontal twin of ResizableWrapper.vue (image height), and the same
  // interaction the project owner already uses there: drag the border, don't
  // type a number.
  //
  // Width is a plain pixel value snapped to 4px, both the stored number and
  // the drag step (see useHorizontalResize). The handle only exists in edit
  // mode; in preview the section renders at exactly the same width with no
  // extra element in the DOM, so what's on screen is what production gets.
  const props = defineProps<{
    min?: number
    max?: number
    // Hidden for the LAST section in a row: there is nothing to its right to
    // resize against, and production lays that one out as the remainder.
    resizable?: boolean
    // Makes the CONTENT inert while a mode that owns the pointer is active
    // (dragging sections around, or resizing them): a gesture must not be
    // hijacked by a control inside the section. Applied here, to the
    // component's own content wrapper, rather than from the parent - a
    // parent's scoped `> *` can't reach this component's own elements, and
    // the handle below has to stay clickable either way.
    inert?: boolean
  }>()

  const width = defineModel<number>('width', { default: 320 })

  const mode = useEditorMode()

  const { dragging, startDrag } = useHorizontalResize({
    min: props.min ?? 120,
    max: props.max,
    onChange: value => {
      width.value = value
    },
  })

  // Keyboard equivalent, so the handle isn't mouse-only: one step per press,
  // the same 4px the drag snaps to.
  function nudge (delta: number) {
    const next = snapToStep(width.value + delta * RESIZE_STEP)
    width.value = Math.max(props.min ?? 120, props.max ? Math.min(props.max, next) : next)
  }
</script>

<template>
  <div class="resizable-column" :style="{ width: width + 'px' }">
    <div class="resizable-column-content" :class="{ 'resizable-column-content--inert': inert }">
      <slot />
    </div>

    <div
      v-if="mode === 'edit' && resizable"
      aria-label="Змінити ширину колонки"
      :aria-valuenow="width"
      class="resizable-column-handle"
      :class="{ 'resizable-column-handle--active': dragging }"
      role="separator"
      tabindex="0"
      :title="`Ширина: ${width}px`"
      @keydown.left.prevent="nudge(-1)"
      @keydown.right.prevent="nudge(1)"
      @mousedown.prevent="startDrag($event, width)"
      @touchstart.prevent="startDrag($event, width)"
    >
      <span class="resizable-column-width">{{ width }}</span>
    </div>
  </div>
</template>

<style scoped>
.resizable-column {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  /* Overridable by the host so the handle reads against ITS background -
     the footer sits on a dark navy panel, most other hosts don't. */
  --resize-accent: #09b;
}
.resizable-column-content--inert {
  pointer-events: none;
}
/* Sits ON the section's own right edge rather than inside it, so grabbing
   the border doesn't eat any of the content width - the section renders at
   exactly the px it stores, in edit mode and in preview alike. */
.resizable-column-handle {
  position: absolute;
  top: 0;
  right: -8px;
  width: 16px;
  height: 100%;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
}
.resizable-column-handle::before {
  content: '';
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: transparent;
  transition: background 0.15s ease;
}
.resizable-column-handle:hover::before,
.resizable-column-handle:focus-visible::before,
.resizable-column-handle--active::before {
  background: var(--resize-accent);
}
/* The live px value, shown only while it's actually being changed - a
   permanent badge over every section border would be noise. */
.resizable-column-width {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--resize-accent);
  color: #1A1A1A;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.resizable-column-handle:hover .resizable-column-width,
.resizable-column-handle:focus-visible .resizable-column-width,
.resizable-column-handle--active .resizable-column-width {
  opacity: 1;
}
</style>
