<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import TemplateItem from './TemplateItem.vue'
  // import TemplateNestedSection from './TemplateNestedSection.vue'

  const props = defineProps<{ item: TemplateBlockModel }>()
</script>

<template>
  <div :class="['d-flex flex-wrap align-stretch justify-space-around ga-4', props.item.class]">
    <template v-for="(block, index) of props.item.children" :key="index">
      <div :class="block.class" :style="{ width: (block.width || 360) + 'px' }">
        <template v-if="block.type === 'section'">
          <div v-for="(child, num) of block.children" :key="num">
            <template-item :item="child" />
          </div>
        </template>
        <template v-else-if="block && block.type === 'component'">
          <component :is="block.component" v-bind="block.props" />
        </template>
        <template v-else>
          <template-item :item="block" />
        </template>
      </div>
    </template>
  </div>
</template>
