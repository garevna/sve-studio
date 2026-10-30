<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import TemplateItem from './TemplateItem.vue'

  // Renders a desktop/mobile image pair (see image-variant.ts) as one unit
  // with a Desktop/Mobile tab switcher. Safe now that TemplateItem.vue
  // strips "desktop-mode"/"mobile-mode" from the rendered class in edit
  // mode (see its "displayClass") - the class that used to fight the tab
  // switch (common.css hides ".mobile-mode" outright at desktop width,
  // regardless of which tab was "selected") is simply never on the DOM
  // while editing, so switching tabs is pure show/hide, no CSS conflict.
  // Pairs are only ever created together, via the "Зображення" picker's
  // "Desktop + Mobile" entry (see EditorView.vue).
  const props = defineProps<{
    blocks: TemplateBlockModel[]
    desktopIndex: number
    mobileIndex: number
  }>()

  const activeTab = ref<'desktop' | 'mobile'>('desktop')
  const activeIndex = computed(() => (activeTab.value === 'desktop' ? props.desktopIndex : props.mobileIndex))
</script>

<template>
  <div class="image-variant-block">
    <v-btn-toggle
      v-model="activeTab"
      class="image-variant-tabs"
      density="compact"
      divided
      mandatory
    >
      <v-btn value="desktop">Десктоп</v-btn>
      <v-btn value="mobile">Мобільна</v-btn>
    </v-btn-toggle>
    <!-- Force a clean remount on tab switch (:key) - desktop and mobile are
      genuinely different underlying blocks, not the same one with a new
      value, so no local state (upload-in-progress, load-error flags) from
      one should ever carry over onto the other. -->
    <template-item :key="activeIndex" :block-index="activeIndex" :blocks="props.blocks" />
  </div>
</template>

<style scoped>
.image-variant-tabs {
  margin-bottom: 8px;
}
</style>
