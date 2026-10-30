<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'

  import { computed } from 'vue'

  import { getImageURL } from '../../services/get-image-url'
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

  const cardWidth = computed(() => properties.width ? properties.width + 'px' : '240px')
  const cardHeight = computed(() => properties.height ? properties.height + 'px' : '360px')

  const background = computed(() => properties.backgroundColor ? `var(--${properties.hoverColor})` : 'var(--light-grey-2)')
  const backgroundImage = computed(() => properties.backgroundImage ? `url(${getImageURL(properties.backgroundImage)})` : null)
  const hoverColor = computed(() => properties.hoverColor ? `var(--${properties.hoverColor})` : 'var(--primary)')
  const hoverImage = computed(() => properties.hoverImage ? `url(${getImageURL(properties.hoverImage)})` : null)
</script>

<template>
  <div style="position: relative">
    <v-hover v-slot="{ isHovering, props }">
      <div
        class="card-normal-state"
        v-bind="props"
      >
        <template-card :item="properties.items[0]" :ver="properties.ver || 1" />
        <v-expand-transition>
          <div
            v-if="isHovering"
            class="d-flex v-card--reveal"
          >
            <template-card :item="properties.items[1]" :ver="properties.ver || 1" />
            <!-- <template-item :item="properties.items[1]" /> -->
          </div>
        </v-expand-transition>
      </div>
    </v-hover>
  </div>
</template>

<style>
  .card-normal-state {
    width: v-bind(cardWidth);
    height: v-bind(cardHeight);
    background: v-bind(background);
    background-image: v-bind(backgroundImage);
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  }
  .v-card--reveal {
    align-items: center;
    bottom: 0;
    justify-content: center;
    opacity: v-bind(opacity);
    position: absolute;
    background: v-bind(hoverColor);
    width: v-bind(cardWidth);
    height: v-bind(cardHeight);
    background-image: v-bind(hoverImage);
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  }
</style>
