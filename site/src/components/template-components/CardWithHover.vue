<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { withHoverTemplate } from '../../configs/hover-card-templates'
  import { useCommonStore } from '../../stores/common'
  import HoverTemplate from '../../templates/components/HoverTemplate.vue'

  // A card that turns into another on hover - the editor's "з ховером"
  // block ({ type: 'component', content: 'CardWithHover', props }). The
  // props are the editor's own (src/components/home-page-components/
  // CardWithHover.vue): the two states are card.children[0] and [1].
  const raw = defineProps<{
    hoverTemplate?: string
    width?: number
    height?: number
    ver?: number
    backgroundColor?: string
    backgroundImage?: string
    hoverColor?: string
    hoverImage?: string
    card: TemplateBlockModel
  }>()

  // As worn: its UI Kit template (configs/hover-card-templates.ts) under
  // its own settings.
  const { hoverCardTemplates } = storeToRefs(useCommonStore())
  const worn = computed(() => withHoverTemplate(raw, hoverCardTemplates.value))
</script>

<template>
  <HoverTemplate
    v-if="worn.card?.children?.[0] && worn.card.children[1]"
    :background-color="worn.backgroundColor || 'transparent'"
    :background-image="worn.backgroundImage"
    :height="worn.height"
    :hover-color="worn.hoverColor || 'secondary'"
    :hover-image="worn.hoverImage || ''"
    :items="[worn.card.children[0], worn.card.children[1]]"
    :ver="worn.ver"
    :width="worn.width"
  />
</template>
