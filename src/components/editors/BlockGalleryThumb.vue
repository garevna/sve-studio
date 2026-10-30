<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import BlockPreview from './BlockPreview.vue'

  // A block in miniature: drawn at a page's width and scaled down to the
  // card it sits in, so it looks like itself, only smaller. A short block is
  // centred in the frame, a tall one shows its top.
  //
  // Several blocks: examples of one block shown in turn (a free-content
  // block with one thing in it, then another) - unless the system asks for
  // less motion, then only the first.
  //
  // pageWidth: the width a block is drawn at before scaling down - narrower
  // for a lone heading or button, which would shrink to a thin line.
  const props = withDefaults(defineProps<{ blocks: TemplateBlockModel[], pageWidth?: number }>(), { pageWidth: 1200 })

  const INTERVAL = 2800

  const frame = ref<HTMLElement | null>(null)
  const content = ref<HTMLElement | null>(null)
  const scale = ref(0.25)
  const offset = ref(0)
  const current = ref(0)
  const shown = computed(() => props.blocks[current.value] ?? props.blocks[0])

  function measure () {
    if (!frame.value || !content.value) {
      return
    }
    scale.value = frame.value.clientWidth / props.pageWidth
    const drawn = content.value.offsetHeight * scale.value
    offset.value = Math.max(0, (frame.value.clientHeight - drawn) / 2)
  }
  watch(current, () => void nextTick(measure))

  let observer: ResizeObserver | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  onMounted(() => {
    observer = new ResizeObserver(measure)
    if (frame.value) observer.observe(frame.value)
    if (content.value) observer.observe(content.value)
    measure()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (props.blocks.length > 1 && !still) {
      timer = setInterval(() => {
        current.value = (current.value + 1) % props.blocks.length
      }, INTERVAL)
    }
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    if (timer) clearInterval(timer)
  })
</script>

<template>
  <div ref="frame" aria-hidden="true" class="block-gallery-thumb">
    <div
      ref="content"
      class="block-gallery-thumb__page"
      :style="{ width: `${props.pageWidth}px`, transform: `translateY(${offset}px) scale(${scale})` }"
    >
      <Transition mode="out-in" name="block-gallery-thumb-fade">
        <BlockPreview v-if="shown" :key="current" :block="shown" />
      </Transition>
    </div>
    <div v-if="props.blocks.length > 1" class="block-gallery-thumb__dots">
      <span
        v-for="(_, index) of props.blocks"
        :key="index"
        :class="['block-gallery-thumb__dot', { 'block-gallery-thumb__dot--on': index === current }]"
      />
    </div>
  </div>
</template>

<style scoped>
.block-gallery-thumb {
  position: relative;
  overflow: hidden;
  /* the site's own page background, so a block looks as it does there */
  background: #fff;
  /* a picture, not a control: nothing inside reacts to the pointer */
  pointer-events: none;
}
.block-gallery-thumb__page {
  position: absolute;
  top: 0;
  left: 0;
  padding: 24px 32px;
  box-sizing: border-box;
  transform-origin: top left;
}
.block-gallery-thumb-fade-enter-active,
.block-gallery-thumb-fade-leave-active { transition: opacity 0.35s ease; }
.block-gallery-thumb-fade-enter-from,
.block-gallery-thumb-fade-leave-to { opacity: 0; }

/* which example is showing */
.block-gallery-thumb__dots {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgb(0 0 0 / 0.35);
}
.block-gallery-thumb__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.5);
  transition: background 0.2s ease;
}
.block-gallery-thumb__dot--on { background: #fff; }
</style>
