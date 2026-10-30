<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'

  import { computed } from 'vue'

  import { useCommonStore } from '@/stores/common'

  import TemplateFlexSection from './TemplateFlexSection.vue'
  import TemplateItem from './TemplateItem.vue'
  import TemplateNestedSection from './TemplateNestedSection.vue'

  const commonStore = useCommonStore()

  const props = defineProps<{ index: number }>()

  const block = computed((): TemplateBlockModel | null => (commonStore.dynamicPageContent?.blocks?.[props.index] as TemplateBlockModel) || null)

  // A block's own background, from the palette: `background` holds a palette
  // key ("blue"), which as a bare CSS value is a different colour altogether
  // (pure #0000FF). Carousels and card sets are left alone - their
  // `background` is their cards' colour, as in the editor.
  const CARD_BACKGROUND_TYPES = new Set(['carousel', 'cards'])
  const ownBackground = computed(() => block.value?.background && !CARD_BACKGROUND_TYPES.has(block.value.type) ? block.value.background : '')
  const blockBackground = computed(() => {
    const value = ownBackground.value
    if (!value) return 'transparent'
    return /^[a-z][\w-]*$/i.test(value) && value !== 'transparent' ? `var(--${value})` : value
  })

  const isLastBlock = computed(() => props.index === (commonStore.dynamicPageContent?.blocks?.length ?? 0) - 1)

  const blockSpacingBottom = computed(() => {
    if (!block.value || block.value.type === 'parallax' || isLastBlock.value) return 0
    return commonStore.currentBlockSpacing
  })
</script>

<template>
  <div v-if="block" :class="ownBackground ? 'colored-block' : ''" :style="{ marginBottom: blockSpacingBottom + 'px' }">
    <template v-if="block.type === 'section'">
      <div :id="block.id || `section-${index}`" :class="['d-flex flex-wrap align-center', block.class]">
        <template-nested-section :item="block" />
      </div>
    </template>
    <template v-else-if="block.type === 'float'">
      <template-flex-section :id="block.id || `flex-section-${index}`" :item="block" />
    </template>
    <template v-else>
      <template-item :id="block.id || `block-${index}`" :item="block" />
    </template>
  </div>
</template>

<style scoped>
.colored-block {
  border-radius: var(--large-border-radius);
  /* padding: 40px; */
  background: v-bind(blockBackground);
}
</style>
