<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { useAjaxStore } from '@/stores/ajax'
  import { CHECKER_STYLE, imageMissing } from '@/utils/image-fallback'
  import TemplateCard from './TemplateCard.vue'

  const properties = defineProps<{
    width?: number
    height?: number
    ver?: number
    size?: number
    backgroundColor?: string
    backgroundImage?: string
    hoverColor: string
    hoverImage?: string
    items: [TemplateBlockModel, TemplateBlockModel]
    opacity?: number
  }>()

  const ajaxStore = useAjaxStore()

  const opacity = computed(() => properties.opacity || 0.9)

  const cardWidth = computed(() => properties.width ? properties.width + 'px' : '240px')
  const cardHeight = computed(() => properties.height ? properties.height + 'px' : '360px')

  // The card is exactly the height the user set (the group's "Висота
  // карток"), both sides. A text that does not fit fades out at the bottom
  // with an ellipsis under it - the user makes the cards taller until it
  // fits. Measured, since only the browser knows where the text ends: again
  // whenever the card's size, its text or the fonts change.
  const box = ref<HTMLElement | null>(null)
  const clipped = ref<[boolean, boolean]>([false, false])
  function measure () {
    const sides = box.value ? [...box.value.querySelectorAll<HTMLElement>('.card-normal-state > [class*="template-card-"]')] : []
    const next = [0, 1].map(index => {
      const side = sides[index]
      const text = side?.lastElementChild as HTMLElement | null | undefined
      if (!side || !text) return false
      // The ellipsis takes the text's own colour.
      const line = text.matches('p') ? text : text.querySelector('p')
      if (line) side.style.setProperty('--hover-card-more-color', getComputedStyle(line).color)
      return text.scrollHeight > text.clientHeight + 1
    }) as [boolean, boolean]
    if (next[0] !== clipped.value[0] || next[1] !== clipped.value[1]) clipped.value = next
  }
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  onMounted(() => {
    if (!box.value) return
    measure()
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(box.value)
    mutationObserver = new MutationObserver(measure)
    mutationObserver.observe(box.value, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] })
    void document.fonts?.ready.then(measure)
  })
  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
  })

  // The fill and the picture go on the card itself, not on a box around
  // it: the card's corners, border and shadow come from its UI Kit style,
  // and a square box behind it showed a filled card with sharp corners.
  // No fill of its own ("transparent") leaves the style's own fill.
  // NOTE: site/src/templates/components/HoverTemplate.vue does the same.
  // A picture given but not found: the checkerboard, as everywhere.
  function fill (color: string | undefined, image: string | undefined, missing: boolean): Record<string, string> | undefined {
    if (image && missing) return { ...CHECKER_STYLE }
    const style: Record<string, string> = {}
    if (color && color !== 'transparent') style.backgroundColor = `var(--${color})`
    if (image) {
      style.backgroundImage = `url(${ajaxStore.getImageURL(image)})`
      style.backgroundSize = 'cover'
      style.backgroundRepeat = 'no-repeat'
      style.backgroundPosition = 'center'
    }
    return Object.keys(style).length > 0 ? style : undefined
  }

  const normalMissing = imageMissing(() => properties.backgroundImage ? ajaxStore.getImageURL(properties.backgroundImage) : '')
  const hoverMissing = imageMissing(() => properties.hoverImage ? ajaxStore.getImageURL(properties.hoverImage) : '')
  const normalFill = computed(() => fill(properties.backgroundColor, properties.backgroundImage, normalMissing.value))
  const hoverFill = computed(() => fill(properties.hoverColor || 'primary', properties.hoverImage, hoverMissing.value))
</script>

<template>
  <!-- A plain box outermost: what the parent passes down (the editor hands
    blocks their model as modelValue) must not land on v-hover, where it
    reads as "hovered" for good. -->
  <div ref="box" class="hover-card-box">
    <v-hover v-slot="{ isHovering, props }">
      <div
        class="card-normal-state"
        v-bind="props"
      >
        <template-card
          :class="{ 'hover-card-side--clipped': clipped[0] }"
          :defaults="{ ver: properties.ver || 1 }"
          :item="properties.items[0]"
          :style="normalFill"
        />
        <template-card
          :class="['v-card--reveal', { 'v-card--reveal--on': isHovering, 'hover-card-side--clipped': clipped[1] }]"
          :defaults="{ ver: properties.ver || 1 }"
          :item="properties.items[1]"
          :style="hoverFill"
        />
      </div>
    </v-hover>
  </div>
</template>

<style>
  /* Both sides sit in one grid cell, both always drawn, both exactly the
     card's set size - the hover side only slides open over the other. */
  .card-normal-state {
    display: grid;
    width: v-bind(cardWidth);
    height: v-bind(cardHeight);
  }
  .card-normal-state > [class*="template-card-"] {
    position: relative;
    grid-area: 1 / 1;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
  /* The text (the card's last part) gives way when the card is too short -
     the icon and the title keep their size. */
  .card-normal-state > [class*="template-card-"] > :last-child {
    min-height: 0;
    overflow: hidden;
  }
  .card-normal-state > .template-card-2,
  .card-normal-state > .template-card-3,
  .card-normal-state > .template-card-4 {
    grid-template-rows: auto minmax(0, 1fr);
  }
  /* Too long: the text fades out, an ellipsis under it. Only the text -
     the card's fill, border and shadow stay whole. */
  .card-normal-state > .hover-card-side--clipped > :last-child {
    mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5em), transparent);
  }
  .card-normal-state > .hover-card-side--clipped::after {
    content: "…";
    position: absolute;
    right: 0;
    bottom: 2px;
    left: 0;
    color: var(--hover-card-more-color, currentColor);
    font-size: 22px;
    line-height: 1;
    text-align: center;
    pointer-events: none;
  }
  .card-normal-state > .v-card--reveal {
    opacity: 0;
    clip-path: inset(100% 0 0 0);
    pointer-events: none;
    transition: clip-path 0.3s ease, opacity 0.3s ease;
  }
  /* Open: clipped wide enough for the card's own shadow. */
  .card-normal-state > .v-card--reveal--on {
    opacity: v-bind(opacity);
    clip-path: inset(-24px);
    pointer-events: auto;
  }
</style>
