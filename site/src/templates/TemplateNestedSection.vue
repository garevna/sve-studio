<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import TemplateItem from './TemplateItem.vue'

  const props = defineProps<{ item: TemplateBlockModel }>()

  function getSideName (index: number) {
    return index === 0 ? 'left' : 'right'
  }
</script>

<template>
  <template v-for="(child, num) of props.item.children" :key="num">
    <div :class="[`section-${getSideName(num)}`, child.class, child.switchOrder ? `section-${getSideName(num)}-switched-order` : '']">
      <!-- Both container types render the same way: their children in
        order. 'section-with-free-content' is the half of a "Дві колонки ->
        Довільний контент" block, and it used to fall through to
        template-item, which has no case for it - so the whole block came
        out blank here while looking right in the editor. A container is
        not a leaf; it has no rendering of its own beyond what is in it. -->
      <template v-if="child.type !== 'section' && child.type !== 'section-with-free-content'">
        <template-item :item="child" />
      </template>
      <div v-else>
        <template v-for="(subchild, i) of child.children" :key="i">
          <template-item :item="subchild" />
        </template>
      </div>
    </div>
  </template>
</template>

<style scoped>
.section-left, .section-right {
  width: calc(50% - 20px);
}
.section-left {
  margin-right: 20px;
}
.section-right {
  margin-left: 20px;
}

@media screen and (max-width: 960px) {
  .section-left, .section-right {
    width: 100%;
    margin-left: 0;
    margin-right: 0;
  }
  .section-left-switched-order,
  .mobile-last {
    order: 2;
    margin-bottom: 28px;
  }
  .section-right-switched-order,
  .mobile-first {
    order: 1;
    margin-bottom: 28px;
  }
}
</style>
