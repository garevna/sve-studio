<script setup lang="ts">
  import type { TemplatePageModel } from '@/types/common'

  import { computed, ref } from 'vue'

  import { useCommonStore } from '@/stores/common'

  import DynamicPageBlockTemplate from './DynamicPageBlockTemplate.vue'

  const commonStore = useCommonStore()

  const pageContent = computed<TemplatePageModel | null>(() => commonStore.dynamicPageContent as TemplatePageModel | null)

  const showContent = ref(true)

  // onMounted(() => console.log('Scroll: ', window.scrollTo({ top: 0, behavior: 'smooth' })))

  // Scrolling on a page change (to the top, or to a linked block) is
  // App.vue's: it knows when the new page is drawn.
</script>

<template>
  <div v-if="showContent && pageContent" :class="`mt-${commonStore.pageContentMarginTop}`">
    <!-- Keyed by page too: another page's blocks start fresh, not reuse
      this one's components. -->
    <template v-for="(block, index) of pageContent.blocks" :key="`${pageContent.id}:${index}`">
      <dynamic-page-block-template :index="index" />
    </template>
  </div>
</template>
