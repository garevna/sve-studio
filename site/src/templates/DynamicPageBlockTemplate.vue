<script setup lang="ts">
  import { computed } from 'vue'

  import type { TemplateBlockModel } from '@/types/common'

  import { useCommonStore } from '@/stores/common'

  import TemplateFlexSection from './TemplateFlexSection.vue'
  import TemplateItem from './TemplateItem.vue'
  import TemplateNestedSection from './TemplateNestedSection.vue'

  const commonStore = useCommonStore()

  const props = defineProps<{ index: number }>()

  const block = computed((): TemplateBlockModel | null => (commonStore.dynamicPageContent?.blocks?.[props.index] as TemplateBlockModel) || null)

  const blockBackground = computed(() => block.value && block.value.background ? block.value.background : 'transparent')

  const isLastBlock = computed(() => props.index === (commonStore.dynamicPageContent?.blocks?.length ?? 0) - 1)

  const blockSpacingBottom = computed(() => {
    if (!block.value || block.value.type === 'parallax' || isLastBlock.value) return 0
    return commonStore.currentBlockSpacing
  })
</script>

<template>
  <div v-if="block" :class="block.background ? 'colored-block' : ''" :style="{ marginBottom: blockSpacingBottom + 'px' }">
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
