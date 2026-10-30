<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, defineAsyncComponent, onBeforeMount, shallowRef } from 'vue'
  import { useCommonStore } from '@/stores/common'
  import ErrorComponent from './helpers/ErrorComponent.vue'
  import LoadingComponent from './helpers/LoadingComponent.vue'
  // import TemplateItem from './TemplateItem.vue'

  const footerContent = computed<TemplateBlockModel | null>(() => useCommonStore().dynamicFooterContent)

  onBeforeMount(() => {
    if (!footerContent.value) {
      return
    }
    if ((footerContent.value.type !== 'section' && footerContent.value.type !== 'float') || !footerContent.value.children) {
      console.log('Invalid footer content')
      return
    }
    for (const block of footerContent.value.children) {
      if (block.type === 'component') {
        // block.component = shallowRef(defineAsyncComponent(() => import(`../components/home-page-components/${block.content}.vue`)))
        block.component = shallowRef(defineAsyncComponent({
          loader: () => import(`../components/home-page-components/${block.content}.vue`),
          loadingComponent: LoadingComponent,
          errorComponent: ErrorComponent,
        }))
      } else {
        if (block.children) {
          for (const child of block.children) {
            // child.component = shallowRef(defineAsyncComponent(() => import(`../components/home-page-components/${child.content}.vue`)))
            if (child.type === 'component') {
              child.component = shallowRef(defineAsyncComponent({
                loader: () => import(`../components/home-page-components/${child.content}.vue`),
                loadingComponent: LoadingComponent,
                errorComponent: ErrorComponent,
              }))
            }
          }
        }
      }
    }
  })
</script>

<template>
  <v-container v-if="footerContent && footerContent.children && footerContent.children.length > 0">
    <div class="d-flex flex-wrap align-start justify-space-around gc-4 gr-16">
      <template v-for="(block, index) of footerContent.children" :key="index">
        <div :style="{ width: (block.width || 360) + 'px' }">
          <div v-if="block.type === 'section'" :class="block.class">
            <div v-for="(child, num) of block.children" :key="num" :class="child.class">
              <!-- <template-item :item="child" /> -->
            </div>
          </div>
          <template v-else-if="block && block.type === 'component'">
            <component :is="block.component" v-bind="block.props" />
          </template>
          <template v-else>
            <!-- <template-item :item="block" /> -->
          </template>
        </div>
      </template>
    </div>
  </v-container>
</template>

<style lang="css" scoped>
.template-cards {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 20px;
}
</style>
