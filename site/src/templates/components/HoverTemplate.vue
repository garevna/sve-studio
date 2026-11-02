<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'

  import { computed } from 'vue'

  import { getImageURL } from '../../services/get-image-url'
  import { CHECKER_STYLE, imageMissing } from '../../utils/image-fallback'
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

  const opacity = computed(() => properties.opacity || 0.9)

  // The card's look: its own, else the block's, else 1 - as in the editor
  // (TemplateCard there takes it as a default).
  function withVer (item: TemplateBlockModel): TemplateBlockModel {
    return { ...item, ver: item.ver || properties.ver || 1 }
  }

  const cardWidth = computed(() => properties.width ? properties.width + 'px' : '240px')
  const cardHeight = computed(() => properties.height ? properties.height + 'px' : '360px')

  // The fill and the picture go on the card itself, not on a box around
  // it: the card's corners, border and shadow come from its UI Kit style,
  // and a square box behind it showed a filled card with sharp corners.
  // No fill of its own ("transparent") leaves the style's own fill.
  // NOTE: the editor's HoverTemplate.vue does the same.
  // A picture given but not found: the checkerboard, as everywhere.
  function fill (color: string | undefined, image: string | undefined, missing: boolean): Record<string, string> | undefined {
    if (image && missing) return { ...CHECKER_STYLE }
    const style: Record<string, string> = {}
    if (color && color !== 'transparent') style.backgroundColor = `var(--${color})`
    if (image) {
      style.backgroundImage = `url(${getImageURL(image)})`
      style.backgroundSize = 'cover'
      style.backgroundRepeat = 'no-repeat'
      style.backgroundPosition = 'center'
    }
    return Object.keys(style).length > 0 ? style : undefined
  }

  const normalMissing = imageMissing(() => properties.backgroundImage ? getImageURL(properties.backgroundImage) : '')
  const hoverMissing = imageMissing(() => properties.hoverImage ? getImageURL(properties.hoverImage) : '')
  const normalFill = computed(() => fill(properties.backgroundColor, properties.backgroundImage, normalMissing.value))
  const hoverFill = computed(() => fill(properties.hoverColor || 'primary', properties.hoverImage, hoverMissing.value))
</script>

<template>
  <!-- A plain box outermost: what the parent passes down (the editor hands
    blocks their model as modelValue) must not land on v-hover, where it
    reads as "hovered" for good. -->
  <div class="hover-card-box">
    <v-hover v-slot="{ isHovering, props }">
      <div
        class="card-normal-state"
        v-bind="props"
      >
        <template-card :item="withVer(properties.items[0])" :style="normalFill" />
        <template-card
          :class="['v-card--reveal', { 'v-card--reveal--on': isHovering }]"
          :item="withVer(properties.items[1])"
          :style="hoverFill"
        />
      </div>
    </v-hover>
  </div>
</template>

<style>
  /* Both sides sit in one grid cell, both always drawn: the card is as tall
     as the set height or the taller side, and the two sides are always the
     same box - the hover side only slides open over the other. */
  .card-normal-state {
    display: grid;
    width: v-bind(cardWidth);
    min-height: v-bind(cardHeight);
  }
  .card-normal-state > [class*="template-card-"] {
    grid-area: 1 / 1;
    box-sizing: border-box;
    width: 100%;
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
