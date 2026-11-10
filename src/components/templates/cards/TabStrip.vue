<script setup lang="ts">
  import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

  // The row of tabs above a tabs block (TabSet.vue). The tabs share the
  // row's whole width; when they don't fit, the row scrolls sideways - a
  // finger swipes it, a mouse drags it - and fades out at the edge that has
  // more. The site's copy is site/src/components/small/TabStrip.vue.
  //
  // Looks (`look`):
  //   pill      - a plate, and on it a pill that flows over to the chosen tab
  //   underline - a line under the row; the mark under the chosen tab
  //               stretches over to the new one and then lets go
  //   folder    - the chosen tab is a folder's tab: one piece with the panel
  //               under it (the panel side is TabSet's)
  // accent: the pill / the mark / the chosen folder tab's text.
  // plate:  the pill's plate / the line under the row / the folder colour.
  const props = withDefaults(defineProps<{
    labels: string[]
    look?: string
    accent?: string
    plate?: string
  }>(), { look: 'pill', accent: 'var(--primary)', plate: 'var(--light-grey-2)' })

  const active = defineModel<number>({ default: 0 })
  // folder: whether the chosen tab touches the row's left or right end -
  // the panel's corner under it is then square (TabSet.vue).
  const emit = defineEmits<{ edges: [edges: { start: boolean, end: boolean }] }>()

  const scroller = ref<HTMLElement | null>(null)
  const track = ref<HTMLElement | null>(null)
  const tabs = ref<HTMLElement[]>([])
  // Left and right edges of the mark, from the track's own edges: moving
  // them one after the other is what stretches it.
  const mark = ref({ left: 0, right: 0, ready: false })
  const movingRight = ref(true)
  // The mark glides only when a tab is chosen. Anything else that moves it -
  // the page settling, a font arriving, the window resized - puts it in
  // place at once; gliding there looked like the mark was lost.
  const gliding = ref(false)
  let glideTimer: ReturnType<typeof setTimeout> | undefined
  const fade = ref({ start: false, end: false })

  function measure () {
    const tab = tabs.value[active.value]
    const width = track.value?.offsetWidth ?? 0
    if (tab && width) {
      mark.value = { left: tab.offsetLeft, right: width - tab.offsetLeft - tab.offsetWidth, ready: true }
    }
    const el = scroller.value
    if (el) {
      fade.value = { start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 }
    }
    if (tab && el) {
      const left = tab.offsetLeft - el.scrollLeft
      emit('edges', { start: left <= 1, end: left + tab.offsetWidth >= el.clientWidth - 1 })
    }
  }

  // The chosen tab is brought into the row's view - the row only, never
  // the page.
  function reveal (index: number) {
    const el = scroller.value
    const tab = tabs.value[index]
    if (!el || !tab) return
    const left = tab.offsetLeft - 24
    const right = tab.offsetLeft + tab.offsetWidth + 24 - el.clientWidth
    if (el.scrollLeft > left) el.scrollTo({ left, behavior: 'smooth' })
    else if (el.scrollLeft < right) el.scrollTo({ left: right, behavior: 'smooth' })
  }

  watch(active, (now, before) => {
    movingRight.value = now >= before
    gliding.value = true
    clearTimeout(glideTimer)
    glideTimer = setTimeout(() => {
      gliding.value = false
    }, 500)
    nextTick(() => {
      measure()
      reveal(now)
    })
  })
  watch(() => [props.labels.join('\u0000'), props.look], () => nextTick(measure))

  let observer: ResizeObserver | null = null
  onMounted(() => {
    measure()
    observer = new ResizeObserver(measure)
    if (track.value) observer.observe(track.value)
    if (scroller.value) observer.observe(scroller.value)
    document.fonts?.ready.then(measure)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    clearTimeout(glideTimer)
  })

  // A mouse drags the row like a finger does. A drag is not a click.
  let drag: { x: number, scroll: number, moved: boolean } | null = null
  let dragged = false
  function onPointerDown (event: PointerEvent) {
    if (event.pointerType !== 'mouse' || !scroller.value) return
    drag = { x: event.clientX, scroll: scroller.value.scrollLeft, moved: false }
  }
  function onPointerMove (event: PointerEvent) {
    if (!drag || !scroller.value) return
    const dx = event.clientX - drag.x
    if (Math.abs(dx) > 5) drag.moved = true
    if (drag.moved) scroller.value.scrollLeft = drag.scroll - dx
  }
  function onPointerUp () {
    dragged = !!drag?.moved
    drag = null
  }
  function choose (index: number) {
    if (dragged) {
      dragged = false
      return
    }
    active.value = index
  }

  function onKey (event: KeyboardEvent) {
    const step = event.key === 'ArrowRight' ? 1 : (event.key === 'ArrowLeft' ? -1 : 0)
    if (!step || props.labels.length === 0) return
    event.preventDefault()
    active.value = (active.value + step + props.labels.length) % props.labels.length
    nextTick(() => tabs.value[active.value]?.focus())
  }
</script>

<template>
  <div
    :class="['tab-strip', `tab-strip--${props.look}`, { 'tab-strip--fade-start': fade.start, 'tab-strip--fade-end': fade.end }]"
    :style="{ '--tab-accent': props.accent, '--tab-plate': props.plate }"
  >
    <div
      ref="scroller"
      class="tab-strip__scroller"
      @pointerdown="onPointerDown"
      @pointerleave="onPointerUp"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @scroll="measure"
    >
      <div ref="track" class="tab-strip__track" role="tablist" @keydown="onKey">
        <span
          v-if="props.look !== 'folder' && mark.ready"
          aria-hidden="true"
          :class="['tab-strip__mark', gliding && (movingRight ? 'tab-strip__mark--right' : 'tab-strip__mark--left')]"
          :style="{ left: `${mark.left}px`, right: `${mark.right}px` }"
        />
        <button
          v-for="(label, index) of props.labels"
          :key="index"
          ref="tabs"
          :aria-selected="index === active"
          :class="['tab-strip__tab', { 'tab-strip__tab--active': index === active }]"
          role="tab"
          :tabindex="index === active ? 0 : -1"
          type="button"
          @click="choose(index)"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-strip {
  position: relative;
  width: 100%;
}
.tab-strip__scroller {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.tab-strip__scroller::-webkit-scrollbar {
  display: none;
}
.tab-strip--fade-start .tab-strip__scroller {
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 32px);
  mask-image: linear-gradient(90deg, transparent, #000 32px);
}
.tab-strip--fade-end .tab-strip__scroller {
  -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 32px), transparent);
  mask-image: linear-gradient(90deg, #000 calc(100% - 32px), transparent);
}
.tab-strip--fade-start.tab-strip--fade-end .tab-strip__scroller {
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 32px, #000 calc(100% - 32px), transparent);
  mask-image: linear-gradient(90deg, transparent, #000 32px, #000 calc(100% - 32px), transparent);
}
.tab-strip__track {
  position: relative;
  display: flex;
  width: max-content;
  min-width: 100%;
}
/* The site's buttons.css styles every <button> (radius, padding, font) -
   the tab's own rules are the more specific ones. */
.tab-strip__tab {
  position: relative;
  z-index: 1;
  flex: 1 0 auto;
  padding: 12px 24px !important;
  border: none;
  background: transparent;
  color: var(--dark-grey);
  font-family: var(--main-font) !important;
  font-size: 16px !important;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: color 0.3s ease, background-color 0.3s ease;
}
.tab-strip__tab:hover {
  color: var(--tab-accent);
}
.tab-strip__tab:focus-visible {
  outline: solid 2px var(--tab-accent);
  outline-offset: -2px;
}
.tab-strip__mark {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  background: var(--tab-accent);
}
/* The edge on the side the mark is moving to leaves first, the other one
   follows: on the way the mark is long, then it lets go. */
.tab-strip__mark--right {
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.09s;
}
.tab-strip__mark--left {
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.09s;
}

/* pill */
.tab-strip--pill .tab-strip__scroller {
  padding: 4px;
  border-radius: var(--large-border-radius);
  background: var(--tab-plate);
}
.tab-strip--pill .tab-strip__mark {
  top: 0;
  bottom: 0;
  border-radius: var(--large-border-radius);
}
.tab-strip--pill .tab-strip__tab {
  border-radius: var(--large-border-radius) !important;
}
.tab-strip--pill .tab-strip__tab--active,
.tab-strip--pill .tab-strip__tab--active:hover {
  color: var(--white);
}

/* underline */
.tab-strip--underline .tab-strip__scroller {
  border-bottom: solid 1px var(--tab-plate);
}
.tab-strip--underline .tab-strip__mark {
  bottom: 0;
  height: 3px;
  border-radius: 3px;
}
.tab-strip--underline .tab-strip__tab {
  border-radius: 0 !important;
}
.tab-strip--underline .tab-strip__tab--active {
  color: var(--tab-accent);
}

/* folder */
.tab-strip--folder .tab-strip__track {
  gap: 4px;
}
.tab-strip--folder .tab-strip__tab {
  border-radius: var(--tab-folder-radius) var(--tab-folder-radius) 0 0 !important;
}
.tab-strip--folder .tab-strip__tab--active {
  background: var(--tab-plate);
  color: var(--tab-accent);
}
/* Where the chosen tab meets the panel, the corners curve outwards, as a
   folder's tab does - not at the row's ends, where the panel's own corner
   is square. */
.tab-strip--folder .tab-strip__tab--active::before,
.tab-strip--folder .tab-strip__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: var(--tab-folder-radius);
  height: var(--tab-folder-radius);
  pointer-events: none;
}
.tab-strip--folder .tab-strip__tab--active::before {
  right: 100%;
  background: radial-gradient(circle at 0 0, transparent calc(var(--tab-folder-radius) - 0.5px), var(--tab-plate) var(--tab-folder-radius));
}
.tab-strip--folder .tab-strip__tab--active::after {
  left: 100%;
  background: radial-gradient(circle at 100% 0, transparent calc(var(--tab-folder-radius) - 0.5px), var(--tab-plate) var(--tab-folder-radius));
}
.tab-strip--folder .tab-strip__tab--active:first-child::before,
.tab-strip--folder .tab-strip__tab--active:last-child::after {
  display: none;
}
.tab-strip--folder .tab-strip__track {
  /* the curve at the tab's foot, and no gap the plate would show through */
  --tab-folder-radius: min(var(--large-border-radius), 16px);
}

@media (prefers-reduced-motion: reduce) {
  .tab-strip__mark,
  .tab-strip__tab {
    transition: none;
  }
}
</style>
