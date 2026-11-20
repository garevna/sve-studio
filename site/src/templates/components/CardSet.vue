<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  // import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { withCardTemplate } from '../../configs/card-templates'

  import { useCommonStore } from '../../stores/common'

  // import { useCommonStore } from '@/stores/common'

  import TemplateCard from './TemplateCard.vue'

  // const { winSize } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  // The block as worn: its UI Kit card template under its own settings
  // (configs/card-templates.ts).
  const { cardTemplates } = storeToRefs(useCommonStore())
  const block = computed(() => withCardTemplate(props.item, cardTemplates.value))

  const id = computed(() => props.item.id)
  const background = computed(() => block.value.background)
  const cards = computed(() => props.item.children || [])
  const color = computed(() => block.value.color)
  const cardBackground = computed(() => block.value.cardBackground)
  const cardStyle = computed(() => block.value.cardStyle)
  const titleClass = computed(() => block.value.titleClass)
  const contentClass = computed(() => block.value.contentClass)
  const cardGaps = computed(() => props.item.cardGaps)
  // const height = computed(() => (props.item.height || 360) + 'px')
  const width = computed(() => props.item.width || 320)
  const size = computed(() => block.value.size || 24)
  const mobileSize = computed(() => block.value.mobileSize)
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
