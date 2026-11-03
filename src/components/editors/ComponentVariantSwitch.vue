<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import NumberToggleButton from '@/components/editors/NumberToggleButton.vue'
  import { variantNumber, variantsOf } from '@/configs/component-variants'
  import { t } from '@/i18n'

  // Picks which component draws a block that has several interchangeable
  // variants - the "1 / 2" toggle on the block's own toolbar, same shape as
  // the one CardContainerActions.vue uses for a cards block's layout.
  //
  // The difference is what it writes: a cards block's `ver` swaps CSS inside
  // one component, while this rewrites the block's `content`, and TemplateItem
  // then imports a different file. Nothing else changes - the block keeps its
  // id, its position and its props, so the heading and every other setting
  // carry over to the variant the client picked.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const variants = computed(() => variantsOf(props.block.content) || [])
  const current = computed(() => variantNumber(props.block.content))

  function select (index: number) {
    const next = variants.value[index - 1]
    if (next && next !== props.block.content) {
      // Writing straight into the block, the same way CardContainerActions
      // sets `ver` - the block object IS the page's reactive state here, not
      // a copy this component was handed.
      // eslint-disable-next-line vue/no-mutating-props
      props.block.content = next
    }
  }
</script>

<template>
  <v-btn-toggle v-if="variants.length > 1" density="compact" :model-value="current" variant="text">
    <NumberToggleButton
      v-for="(name, index) of variants"
      :key="name"
      :tooltip="t('block.variant', { value: index + 1 })"
      :value="index + 1"
      @click="select(index + 1)"
    />
  </v-btn-toggle>
</template>
