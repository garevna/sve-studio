<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import TemplateItem from './TemplateItem.vue'
  // import TemplateNestedSection from './TemplateNestedSection.vue'

  const props = defineProps<{ item: TemplateBlockModel }>()

  // A column's width: the block's own, or - a card with hover - the card's
  // (its component props, the group's "Ширина карток"; 240 when unset), so
  // the card fills its column instead of sitting at the left of a 360px
  // one. Never wider than the screen.
  // NOTE: the editor's TemplateFlexSection.vue does the same.
  function columnWidth (block: TemplateBlockModel): number {
    if (block.width) return block.width
    if (block.type === 'component' && (block.content as unknown) === 'CardWithHover') {
      return Number((block.props as Record<string, unknown> | undefined)?.width) || 240
    }
    return 360
  }
</script>

<template>
  <div :class="['d-flex flex-wrap align-stretch justify-space-around ga-4', props.item.class]">
    <template v-for="(block, index) of props.item.children" :key="index">
      <div :class="block.class" :style="{ width: columnWidth(block) + 'px', maxWidth: '100%' }">
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
