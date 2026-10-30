<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import TemplateCard from './TemplateCard.vue'

  // Mirrors the production site's src\templates\components\CardSet.vue
  // exactly - `<template-card>` renders as a DIRECT flex child of this
  // container, matching production's structure with no dispatcher/wrapper
  // element in between (unlike routing through TemplateItem.vue, which has
  // its own wrapping <div> - that extra box breaks a ver=3 card's
  // width:100% the same way EditableBlockWrapper used to: a percentage-sized
  // child inside an auto-sized parent has no way to make that parent grow to
  // match it, so the whole chain collapses toward zero instead of stretching).
  const props = defineProps<{ item: TemplateBlockModel }>()

  const id = computed(() => props.item.id)
  const background = computed(() => props.item.background)
  const cards = computed(() => props.item.children || [])
  const color = computed(() => props.item.color)
  const width = computed(() => props.item.width || 320)
  const size = computed(() => props.item.size || 24)
  const ver = computed(() => props.item.ver || 1)

  // Production mutates each card object in place (Object.assign(card, {...})).
  // Harmless there (display-only), but this editor saves the very same
  // reactive object back to JSON - mutating it on every preview render would
  // permanently overwrite any legitimate per-card ver/width/etc override the
  // moment someone opens preview once. Building a fresh merged object instead
  // gets the identical rendered result without touching the stored data.
  function cardWithDefaults (card: TemplateBlockModel): TemplateBlockModel {
    return {
      ...card,
      width: width.value,
      height: props.item.height,
      size: size.value,
      ver: ver.value,
      background: background.value,
      cardBackground: props.item.cardBackground,
      titleClass: props.item.titleClass,
      contentClass: props.item.contentClass,
      color: color.value,
    }
  }
</script>

<template>
  <div :id="id" :class="[props.item.class || '', 'card-set-wrapper d-flex flex-wrap justify-center align-stretch ga-4']">
    <template v-for="(card, index) of cards" :key="index">
      <template-card :item="cardWithDefaults(card)" />
    </template>
  </div>
</template>

<style scoped>
.card-set-wrapper > * {
  align-self: stretch;
}
</style>
