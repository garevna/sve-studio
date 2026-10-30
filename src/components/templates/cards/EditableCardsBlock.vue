<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import TemplateItem from '../TemplateItem.vue'
  import CardContainerActions from './CardContainerActions.vue'

  // The "cards" block's own edit-mode body - extracted out of
  // DynamicPageTemplate.vue's per-block loop so each instance gets its own
  // local drag-to-reorder state (dragActive/useSortableList), rather than
  // needing an index-keyed map to track multiple independent "cards" blocks
  // on the same page.
  defineProps<{
    block: TemplateBlockModel
    cardDefaults: Partial<TemplateBlockModel>
  }>()
  const emit = defineEmits<{
    'edit-card': [index: number]
    'delete-card': [index: number]
  }>()

  const dragActive = ref(false)

  // v-for below keys on the card object itself, not its index - Sortable
  // physically moves the DOM node during a drag, outside Vue's own
  // reconciliation. With a positional key, Vue sees "same keys (0,1,2...)
  // in the same order" after the array splice and just patches props into
  // whatever nodes are already sitting there, disagreeing with where
  // Sortable actually left them - the reorder can silently fail to stick.
  // A stable per-object key lets Vue's own diff track identity correctly
  // across the move.
</script>

<template>
  <EditableBlockWrapper :block="block" no-inline-padding type="block">
    <template #actions>
      <CardContainerActions v-model:drag-active="dragActive" :block="block" />
    </template>
    <!-- Deleting the whole block is in its settings menu (PageBlockFrame). -->
    <SortableList v-model:active="dragActive" class="template-cards" :items="block.children">
      <template #item="{ index: num, dragClass, contentClass, dragging }">
        <EditableBlockWrapper :class="dragClass" type="card">
          <template v-if="!dragging" #actions>
            <ToolbarIconButton icon="mdi-pencil" tooltip="Редагувати картку" @click="emit('edit-card', num)" />
          </template>
          <template v-if="!dragging" #delete>
            <ToolbarIconButton icon="mdi-delete" tooltip="Видалити картку" @click="emit('delete-card', num)" />
          </template>
          <template-item
            :block-index="num"
            :blocks="block.children as TemplateBlockModel[]"
            :class="contentClass"
            :defaults="cardDefaults"
          />
        </EditableBlockWrapper>
      </template>
    </SortableList>
  </EditableBlockWrapper>
</template>

<style scoped>
.template-cards {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 20px;
}
</style>
