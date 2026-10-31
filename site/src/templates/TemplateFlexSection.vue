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
        <!-- Everything else - a component block (a card with hover:
          { type: 'component', content: 'CardWithHover' }) included - goes
          through TemplateItem, which loads a component by its name in
          `content`. A branch here used to read `block.component`, which
          no block has, and drew nothing. -->
        <template v-else>
          <template-item :item="block" />
        </template>
      </div>
    </template>
  </div>
</template>
