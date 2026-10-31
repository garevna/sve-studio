<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import HoverTemplate from '../../templates/components/HoverTemplate.vue'

  // A card that turns into another on hover - the editor's "з ховером"
  // block ({ type: 'component', content: 'CardWithHover', props }). The
  // props are the editor's own (src/components/home-page-components/
  // CardWithHover.vue): the two states are card.children[0] and [1].
  const props = defineProps<{
    width?: number
    height?: number
    ver?: number
    backgroundColor?: string
    backgroundImage?: string
    hoverColor?: string
    hoverImage?: string
    card: TemplateBlockModel
  }>()
</script>

<template>
  <HoverTemplate
    v-if="props.card?.children?.[0] && props.card.children[1]"
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
