<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import HoverTemplate from './components/HoverTemplate.vue'
  // import TemplateCard from './TemplateCard.vue'

  const props = defineProps<{ item: TemplateBlockModel }>()

  // const props = defineProps<{
  //   width?: number
  //   height?: number
  //   ver?: number
  //   size?: number
  //   color?: string
  //   backgroundColor?: string
  //   backgroundImage?: string
  //   hoverColor?: string
  //   hoverImage?: string
  //   card: TemplateBlockModel
  // }>()

  // const block = computed(() => dynamicPageContent.value ? dynamicPageContent.value.blocks[props.index] : null)
</script>

<template>
  <hover-template
    v-if="props.item && props.item.children && props.item.children[0] && props.item.children[1]"
    :background-color="props.item.background || 'transparent'"
    :background-image="props.item.backgroundImage"
    :height="props.item.height"
    :hover-color="props.item.hoverColor || 'secondary'"
    :hover-image="props.item.hoverImage || ''"
    :items="[props.item.children[0], props.item.children[1]]"
    :ver="props.item.ver"
    :width="props.item.width"
  >
    <!-- <template #default-content>
      {{ props.card.children[0] }}
      <template-card
        :background="props.backgroundColor"
        :color="props.color"
        :height="props.height || props.card.height"
        :item="props.card.children[0]"
        :size="props.size"
        :ver="props.ver"
        :width="props.width || props.card.width"
      />
    </template>
    <template #hover-content>
      {{ props.card.children[1] }}
      <template-card
        :background="props.hoverColor || 'primary'"
        :color="props.color"
        :height="props.height || props.card.height"
        :item="props.card.children[1]"
        :size="props.size"
        :ver="props.ver"
        :width="props.width || props.card.width"
      />
    </template> -->
  </hover-template>
</template>
