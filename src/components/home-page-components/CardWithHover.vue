<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import HoverTemplate from '@/components/templates/cards/HoverTemplate.vue'

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
  <hover-template
    v-if="props.card && props.card.children && props.card.children[0] && props.card.children[1]"
    :background-color="props.backgroundColor || 'transparent'"
    :background-image="props.backgroundImage"
    :height="props.height"
    :hover-color="props.hoverColor || 'secondary'"
    :hover-image="props.hoverImage || ''"
    :items="[props.card.children[0], props.card.children[1]]"
    :ver="props.ver"
    :width="props.width"
  />
</template>
