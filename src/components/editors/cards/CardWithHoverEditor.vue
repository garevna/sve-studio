<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

  const props = defineProps<{
    width?: number
    height?: number
    ver?: number
    size?: number
    color?: string
    backgroundColor?: string
    backgroundImage?: string
    hoverColor?: string
    hoverImage?: string
    card: TemplateBlockModel
  }>()
</script>

<template>
  <template v-if="props.card.children">
    <div>
      <template-card :item="props.card.children[0]" :ver="props.ver || 1" />
    </div>
    <div>
      <template-card v-if="props.card.children" :item="props.card.children[1]" :ver="props.ver || 1" />
    </div>
  </template>
</template>
