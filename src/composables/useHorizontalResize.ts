import { onBeforeUnmount, ref } from 'vue'

// Every size the footer constructor stores is a plain pixel number, and
// every one of them is a multiple of 4 - both the value and the drag step.
// The project owner's rule, and it's what keeps a hand-dragged layout from
// accumulating values like 347px: the footer's own spacing scale is built in
// 4px units, so snapping to it means dragging can only ever land on a value
// that was already valid to type in.
export const RESIZE_STEP = 4

export function snapToStep (value: number): number {
  return Math.round(value / RESIZE_STEP) * RESIZE_STEP
}

/**
 * Drag-to-resize along the X axis, shared by the footer's section-width and
 * section-gap handles. The vertical twin of this lives inline in
 * ResizableWrapper.vue (image height) - not extracted with it, since that
 * one has no snapping and changing its behaviour isn't part of this.
 */
export function useHorizontalResize (options: {
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  const dragging = ref(false)
  let startX = 0
  let startValue = 0
  let moveHandler: ((event: Event) => void) | null = null
  let upHandler: (() => void) | null = null

  function clientX (event: MouseEvent | TouchEvent): number {
    return 'touches' in event ? (event.touches[0]?.clientX ?? 0) : event.clientX
  }

  function onMove (event: MouseEvent | TouchEvent) {
    if (!dragging.value) {
      return
    }
    // Snap the RESULT, not the delta: snapping the delta would let a
    // starting value that isn't itself a multiple of 4 (older content, or a
    // value typed in before this rule existed) stay off-grid forever.
    let next = snapToStep(startValue + clientX(event) - startX)
    if (options.min !== undefined) {
      next = Math.max(options.min, next)
    }
    if (options.max !== undefined) {
      next = Math.min(options.max, next)
    }
    options.onChange(next)
  }

  function endDrag () {
    if (!dragging.value) {
      return
    }
    dragging.value = false
    if (moveHandler) {
      window.removeEventListener('mousemove', moveHandler)
      window.removeEventListener('touchmove', moveHandler)
    }
    if (upHandler) {
      window.removeEventListener('mouseup', upHandler)
      window.removeEventListener('touchend', upHandler)
    }
    moveHandler = null
    upHandler = null
    // The cursor is forced globally for the whole gesture (below) - dragging
    // past the handle's own few pixels otherwise flickers back to whatever
    // cursor the element under the pointer specifies.
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  function startDrag (event: MouseEvent | TouchEvent, currentValue: number) {
    dragging.value = true
    startX = clientX(event)
    startValue = currentValue

    moveHandler = (ev: Event) => onMove(ev as MouseEvent | TouchEvent)
    upHandler = () => endDrag()
    window.addEventListener('mousemove', moveHandler)
    window.addEventListener('touchmove', moveHandler, { passive: false })
    window.addEventListener('mouseup', upHandler)
    window.addEventListener('touchend', upHandler)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  onBeforeUnmount(endDrag)

  return { dragging, startDrag }
}
