<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'

  // import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  // import { useCommonStore } from '@/stores/common'

  import TemplateCard from './TemplateCard.vue'

  // const { winSize } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const id = computed(() => props.item.id)
  const background = computed(() => props.item.background)
  const cards = computed(() => props.item.children || [])
  const color = computed(() => props.item.color)
  const cardBackground = computed(() => props.item.cardBackground)
  const cardStyle = computed(() => props.item.cardStyle)
  const titleClass = computed(() => props.item.titleClass)
  const contentClass = computed(() => props.item.contentClass)
  const cardGaps = computed(() => props.item.cardGaps)
  // const height = computed(() => (props.item.height || 360) + 'px')
  const width = computed(() => props.item.width || 320)
  const size = computed(() => props.item.size || 24)
  const mobileSize = computed(() => props.item.mobileSize)
  const ver = computed(() => props.item.ver || 1)

  // const width = computed(() => (cards.value[0]?.width || 320) + 'px')
</script>

<template>
  <div :id="id" :class="[props.item.class || '', 'card-set-wrapper d-flex flex-wrap justify-center align-stretch ga-4']">
    <template v-for="(card, index) of cards" :key="index">
      <template-card :item="Object.assign(card, { width, height: props.item.height, size, mobileSize, ver, background, color, cardBackground, cardStyle, titleClass, contentClass, cardGaps })" />
    </template>
  </div>
</template>

<style scoped>
  .card-set-wrapper {
    /* height: v-bind(height); */
  }
  .card-set-wrapper > * {
    align-self: stretch;
  }
</style>
