<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import HoverTemplate from '@/components/templates/cards/HoverTemplate.vue'
  import { hoverCardTemplates } from '@/composables/useCardTemplates'
  import { withHoverTemplate } from '@/configs/hover-card-templates'

  const raw = defineProps<{
    hoverTemplate?: string
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

  // As worn: its UI Kit template (configs/hover-card-templates.ts) under
  // its own settings, as on the site.
  const worn = computed(() => withHoverTemplate(raw, hoverCardTemplates.value))
</script>

<template>
  <hover-template
    v-if="worn.card && worn.card.children && worn.card.children[0] && worn.card.children[1]"
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
